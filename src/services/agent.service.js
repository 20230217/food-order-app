// d:\Uniapp\food-order-app\server\src\services\agent.service.js

const CartService = require('./cartService');
const DishModel = require('../models/dishModel');

const pendingActions = new Map();
const recipeContexts = new Map();
const normalizeMessage = (message) => String(message || '').trim();

const callDeepSeek = async (messages, options = {}) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }

  const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages,
      temperature: options.temperature ?? 0.2,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `DeepSeek API request failed: ${response.status}`);
  }

  return String(data?.choices?.[0]?.message?.content || '').trim();
};

const toNumber = (value, defaultValue = 1) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : defaultValue;
};

const buildToolCall = (name, args = {}) => ({ name, args });
const isDeepSeekConfigured = () => Boolean(process.env.DEEPSEEK_API_KEY);
const invokeRecipeFallback = async (prompt) => {
  if (!isDeepSeekConfigured()) {
    return 'AI 参考做法暂时不可用：后端还没有配置 DEEPSEEK_API_KEY。请先在 Railway Variables 中添加 DeepSeek API Key 后重新部署。';
  }

  try {
    return await callDeepSeek([
      {
        role: 'system',
        content: '你是一个中文家庭菜谱助手，回答要清晰、实用、适合家庭制作。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);
  } catch (error) {
    console.error('Error invoking DeepSeek recipe fallback:', error);
    return '抱歉，AI 参考做法生成失败，请稍后再试。';
  }
};

const invokeRecommendationInspiration = async (message, keyword, dishes = []) => {
  const existingDishText = dishes.length > 0
    ? dishes.slice(0, 5).map((dish) => `- ${dish.name}${dish.description ? `：${dish.description}` : ''}`).join('\n')
    : '数据库暂时没有匹配菜品。';

  const prompt = `你是家庭菜品灵感助手。用户想获得菜品推荐，不只是点餐。

  用户问题：${message}
  推荐关键词：${keyword}
  数据库已有匹配菜品：
  ${existingDishText}

  请用中文给出 4 道新的菜品灵感，要求：
  1. 可以和数据库菜品不同，给用户新鲜感；
  2. 必须符合用户关键词或口味；
  3. 每道菜包含【菜名】【特点】【适合原因】；
  4. 不要编造菜品ID，不要说可以直接加入购物车；
  5. 语言简洁，适合家庭点餐或做菜参考。`;

  if (!isDeepSeekConfigured()) {
    return 'AI 灵感推荐暂时不可用：后端还没有配置 DEEPSEEK_API_KEY。';
  }

  try {
    return await callDeepSeek([
      {
        role: 'system',
        content: '你是一个中文家庭菜品灵感助手，推荐要具体、简洁、不要编造菜品ID。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ], { temperature: 0.5 });
  } catch (error) {
    console.error('Error invoking DeepSeek recommendation inspiration:', error);
    return 'AI 灵感推荐暂时生成失败，请稍后再试。';
  }
};

const buildLocalAssistantReply = async () => {
  const dishes = await DishModel.getAllDishes();

  if (!dishes || dishes.length === 0) {
    return '后端服务已连接，但当前 SQLite 数据库里还没有菜品数据。原 MySQL 数据不会自动出现在 SQLite 中，需要先把 MySQL 数据导出并导入 SQLite，或通过新增菜品接口重新添加。';
  }

  const preview = dishes
    .slice(0, 5)
    .map((dish, index) => `${index + 1}. ${dish.name}（菜品ID：${dish.id}，价格 ${dish.price || 0} 元）`)
    .join('\n');

  return `我已连接后端，但当前未配置 DEEPSEEK_API_KEY，所以只能使用本地菜品规则回复。\n你可以问我“推荐菜品”“查看购物车”“把菜品ID为X的菜加入购物车”。\n\n当前部分菜品：\n${preview}`;
};

const summarizeCart = (cartItems) => {
  const totalQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return {
    totalQuantity,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

const formatCartReply = (cartItems) => {
  if (!cartItems || cartItems.length === 0) {
    return '当前您的购物车是空的。';
  }

  const lines = cartItems.map((item, index) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);
    const subtotal = Number((price * quantity).toFixed(2));

    return `${index + 1}. ${item.name}（菜品ID：${item.dish_id}）x ${quantity}，单价 ${price} 元，小计 ${subtotal} 元`;
  });

  const summary = summarizeCart(cartItems);

  return `您的购物车里有：\n${lines.join('\n')}\n共 ${summary.totalQuantity} 份，总计 ${summary.totalAmount} 元。`;
};

const formatDishRecommendations = (dishes, keyword) => {
  if (!dishes || dishes.length === 0) {
    return `数据库中暂时没有找到与“${keyword}”匹配的菜品。您可以换一个关键词试试。`;
  }

  const lines = dishes.slice(0, 5).map((dish, index) => {
    const priceText = dish.price !== undefined && dish.price !== null ? `，价格 ${dish.price} 元` : '';
    const descriptionText = dish.description ? `，${dish.description}` : '';

    return `${index + 1}. ${dish.name}（菜品ID：${dish.id}${priceText}）${descriptionText}`;
  });

  return `根据“${keyword}”，我在数据库中找到这些菜品：\n${lines.join('\n')}\n如果想加入购物车，可以说“把菜品ID为X的菜加入购物车”。`;
};

const formatHybridRecommendations = (dishes, keyword, inspiration) => {
  const databaseText = dishes && dishes.length > 0
    ? formatDishRecommendations(dishes, keyword)
    : `数据库中暂时没有找到与“${keyword}”匹配的菜品。`;

  return `${databaseText}
  如果你想换换口味，这里还有一些 AI 新灵感（这些不是数据库菜品，没有菜品ID）：
  ${inspiration}`;
};

const formatDishStepsReply = (dish, steps) => {
  if (!dish) {
    return '没有找到这道菜，请换一个菜名试试。';
  }

  if (!steps || steps.length === 0) {
    return `我找到了“${dish.name}”，但数据库里暂时没有维护它的制作步骤。`;
  }

  const stepLines = steps.map((step) => {
    return `${step.stepOrder}. ${step.content}`;
  });

  const meta = [
    dish.category ? `分类：${dish.category}` : '',
    dish.cook_time ? `预计用时：${dish.cook_time}分钟` : '',
    dish.difficulty ? `难度：${dish.difficulty}` : '',
  ]
    .filter(Boolean)
    .join('，');

  const metaText = meta ? `\n${meta}` : '';

  return `“${dish.name}”的制作步骤如下：${metaText}\n${stepLines.join('\n')}`;
};

const getRecommendationKeyword = (message) => {
  const keywordRules = [
    { pattern: /低脂|减脂|少油|清淡/, keyword: '低脂' },
    { pattern: /高蛋白|蛋白/, keyword: '高蛋白' },
    { pattern: /中式|中餐|中国菜/, keyword: '中式' },
    { pattern: /西式|西餐/, keyword: '西式' },
    { pattern: /日韩|日式|韩式|日本|韩国/, keyword: '日韩' },
    { pattern: /素食|素菜|蔬菜/, keyword: '素食' },
    { pattern: /辣|麻辣|香辣/, keyword: '辣' },
  ];

  const matchedRule = keywordRules.find((rule) => rule.pattern.test(message));

  if (matchedRule) {
    return matchedRule.keyword;
  }

  const keywordMatch = message.match(/(?:推荐|搜索|查找|找)(?:一下|一些|几个|个)?(.+?)(?:的?菜品|的?菜|吃的|$)/);

  if (keywordMatch && keywordMatch[1]) {
    return keywordMatch[1].replace(/[，。！？,.!?\s]/g, '').slice(0, 20) || '菜品';
  }

  return '菜品';
};

const parseAddToCartIntent = (message) => {
  const dishIdMatch =
    message.match(/菜品\s*ID\s*(?:为|是|:|：)?\s*(\d+)/i) ||
    message.match(/ID\s*(?:为|是|:|：)?\s*(\d+)/i);

  if (!dishIdMatch) {
    return null;
  }

  const quantityMatch = message.match(/(\d+)\s*(?:份|个|道)/);
  const dishId = toNumber(dishIdMatch[1]);
  const quantity = quantityMatch ? toNumber(quantityMatch[1]) : 1;

  return { dishId, quantity };
};

const isViewCartIntent = (message) =>
  /查看.*购物车|我的购物车|购物车.*(有什么|内容|多少|总价|数量)|看.*购物车/.test(message);

const isClearCartIntent = (message) =>
  /清空.*购物车|购物车.*清空/.test(message);

const isConfirmAddIntent = (message) =>
  /确认加入|确定加入|确认添加|确定添加|确认加购|确定加购/.test(message);

const isConfirmClearIntent = (message) =>
  /确认清空|确定清空/.test(message);

const isDishStepsIntent = (message) =>
  /怎么做|咋做|如何做|想做|要做|学做|想学|如何烧|怎么烧|咋烧|做法|制作方法|制作步骤|步骤|教程|菜谱|我问的是/.test(message);

const isRecommendIntent = (message) =>
  /推荐|搜索|查找|找.*菜|低脂|减脂|高蛋白|中式|西式|日韩|素食|清淡/.test(message);

const isExplicitRecommendIntent = (message) =>
  /推荐|搜索|查找|找.*菜|找.*吃的/.test(message);

const isRecipePreferenceFollowup = (message) =>
  /麻辣|微辣|香辣|酸辣|清淡|少油|低脂|重口|咸鲜|甜口|不要辣|不辣|口味|辣一点|淡一点/.test(message);

const cleanDishName = (value) => {
  return String(value || '')
    .replace(/请问|请告诉我|告诉我|我想知道|帮我看看|帮我查查|帮我|一下|这个|这道菜|我问的是/g, '')
    .replace(/怎么做|咋做|如何做|想做|要做|学做|想学|如何烧|怎么烧|咋烧|做法|制作方法|制作步骤|步骤|教程|菜谱/g, '')
    .replace(/[，。！？,.!?\s]/g, '')
    .trim();
};

const buildRecipeFallbackPrompt = (message, dish, preference = '') => {
  const dishName = dish ? dish.name : cleanDishName(message) || message;
  const preferenceText = preference ? `\n用户补充口味要求：${preference}` : '';

  return `你是家庭菜谱助手。用户正在询问“${dishName}”的做法，不是在点餐，也不是在找推荐菜。

请直接生成“${dishName}”的家庭参考做法。

严格要求：
1. 只能回答“${dishName}”这道菜的做法，不要推荐其他菜品；
2. 不要询问是否加入购物车，不要提购物车；
3. 不要说“数据库没有所以无法回答”；
4. 如果数据库没有步骤，就把内容作为 AI 参考做法给出；
5. 必须包含【食材】【调料】【制作步骤】【小贴士】；
6. 制作步骤控制在 5-8 步，适合家庭制作；
7. 如果涉及鱼、肉、蛋类，要提醒彻底加热。

用户原问题：${message}${preferenceText}`;
};

const extractDishNameForSteps = async (message) => {
  const cleanedName = cleanDishName(message);

  if (cleanedName) {
    const directMatches = await DishModel.searchDishesByName(cleanedName);

    if (directMatches.length > 0) {
      return directMatches[0];
    }
  }

  const allDishes = await DishModel.getAllDishes();

  const matchedDish = allDishes.find((dish) => {
    return message.includes(dish.name);
  });

  if (matchedDish) {
    return matchedDish;
  }

  return null;
};

const AgentService = {
  /**
   * 处理 Agent 的聊天请求
   * @param {number} userId - 用户ID
   * @param {string} message - 用户消息
   * @param {Array<object>} chatHistory - 聊天历史 (可选)
   * @returns {Promise<object>} Agent 的回复和工具调用信息
   */
  chatWithAgent: async (userId, message, chatHistory = []) => {
    try {
      const normalizedUserId = toNumber(userId);
      const normalizedMessage = normalizeMessage(message);

      if (isConfirmClearIntent(normalizedMessage)) {
        const pendingAction = pendingActions.get(normalizedUserId);

        if (!pendingAction || pendingAction.type !== 'clear_cart') {
          return {
            reply: '当前没有待确认的清空购物车操作。',
            toolCalls: [],
          };
        }

        await CartService.clearCart(normalizedUserId);
        pendingActions.delete(normalizedUserId);

        return {
          reply: '已为您清空购物车。',
          toolCalls: [
            buildToolCall('clear_cart', {
              userId: normalizedUserId,
            }),
          ],
        };
      }

      const pendingAction = pendingActions.get(normalizedUserId);

      if (
        pendingAction?.type === 'add_to_cart' &&
        (/确认|确定|好的|可以/.test(normalizedMessage) || isConfirmAddIntent(normalizedMessage))
      ) {
        const added = await CartService.addToCart(
          normalizedUserId,
          pendingAction.dishId,
          pendingAction.quantity
        );
        const cartItems = await CartService.getCartItems(normalizedUserId);
        const addedItem = cartItems.find((item) => Number(item.dish_id) === Number(pendingAction.dishId));
        pendingActions.delete(normalizedUserId);
        if (!added || !addedItem) {
          return {
            reply: `我尝试加入菜品ID为 ${pendingAction.dishId} 的菜品，但没有在购物车中确认到该菜品，请稍后重试。`,
            toolCalls: [
              buildToolCall('add_to_cart', {
                userId: normalizedUserId,
                dishId: pendingAction.dishId,
                quantity: pendingAction.quantity,
                success: false,
              }),
            ],
          };
        }

        return {
          reply: `已将菜品ID为 ${pendingAction.dishId} 的菜品加入购物车，当前购物车如下：
${formatCartReply(cartItems)}`,
          toolCalls: [
            buildToolCall('add_to_cart', {
              userId: normalizedUserId,
              dishId: pendingAction.dishId,
              quantity: pendingAction.quantity,
              success: true,
            }),
          ],
        };
      }

      if (/^(确认|确定|好的|可以)$/.test(normalizedMessage) || isConfirmAddIntent(normalizedMessage)) {
        return {
          reply: '当前没有待确认的加入购物车操作。请先告诉我要加入哪个菜品，例如“把菜品ID为1的菜加入购物车”。',
          toolCalls: [],
        };
      }

      const recipeContext = recipeContexts.get(normalizedUserId);
      if (recipeContext && isRecipePreferenceFollowup(normalizedMessage) && !isExplicitRecommendIntent(normalizedMessage)) {
        const recipeReply = await invokeRecipeFallback(
          buildRecipeFallbackPrompt(recipeContext.originalMessage, recipeContext.dish, normalizedMessage)
        );
        return {
          reply: `好的，按“${normalizedMessage}”口味调整“${recipeContext.dishName}”的 AI 参考做法：\n${recipeReply}`,
          toolCalls: [
            buildToolCall('recipe_ollama_fallback', {
              reason: 'recipe_preference_followup',
              dishName: recipeContext.dishName,
              preference: normalizedMessage,
            }),
          ],
        };
      }

      if (isViewCartIntent(normalizedMessage)) {
        const cartItems = await CartService.getCartItems(normalizedUserId);

        return {
          reply: formatCartReply(cartItems),
          toolCalls: [
            buildToolCall('get_cart', {
              userId: normalizedUserId,
            }),
          ],
        };
      }

      if (isClearCartIntent(normalizedMessage)) {
        pendingActions.set(normalizedUserId, {
          type: 'clear_cart',
        });

        return {
          reply: '清空购物车会删除当前购物车中的所有菜品，请确认是否清空？',
          toolCalls: [],
        };
      }

      if (/加入购物车|添加到购物车|加到购物车|加购物车/.test(normalizedMessage)) {
        const addIntent = parseAddToCartIntent(normalizedMessage);

        if (!addIntent) {
          return {
            reply: '请告诉我要加入购物车的菜品ID，例如“把菜品ID为1的菜加入购物车”。',
            toolCalls: [],
          };
        }

        const dish = await DishModel.getDishById(addIntent.dishId);

        if (!dish) {
          return {
            reply: `没有找到菜品ID为 ${addIntent.dishId} 的菜品，请检查后再试。`,
            toolCalls: [
              buildToolCall('get_dish_detail', {
                dishId: addIntent.dishId,
              }),
            ],
          };
        }

        pendingActions.set(normalizedUserId, {
          type: 'add_to_cart',
          dishId: addIntent.dishId,
          quantity: addIntent.quantity,
        });

        return {
          reply: `请确认是否将“${dish.name}”（菜品ID：${addIntent.dishId}）加入购物车，数量为 ${addIntent.quantity}？`,
          toolCalls: [
            buildToolCall('get_dish_detail', {
              dishId: addIntent.dishId,
            }),
          ],
        };
      }

      if (isDishStepsIntent(normalizedMessage)) {
        if (pendingActions.get(normalizedUserId)?.type === 'add_to_cart') {
          pendingActions.delete(normalizedUserId);
        }
        const dish = await extractDishNameForSteps(normalizedMessage);
        if (dish) {
          const steps = await DishModel.getDishStepsById(dish.id);

          if (steps && steps.length > 0) {
            recipeContexts.set(normalizedUserId, {
              dish,
              dishName: dish.name,
              originalMessage: normalizedMessage,
            });
            return {
              reply: formatDishStepsReply(dish, steps),
              toolCalls: [
                buildToolCall('search_dishes_by_name', {
                  query: dish.name,
                }),
                buildToolCall('get_dish_steps', {
                  dishId: dish.id,
                  dishName: dish.name,
                }),
              ],
            };
          }
        }

        const fallbackDishName = dish ? dish.name : cleanDishName(normalizedMessage) || normalizedMessage;
        const recipeReply = await invokeRecipeFallback(
          buildRecipeFallbackPrompt(normalizedMessage, dish)
        );

        recipeContexts.set(normalizedUserId, {
          dish,
          dishName: fallbackDishName,
          originalMessage: normalizedMessage,
        });
        return {
          reply: dish
            ? `数据库里有“${dish.name}”，但暂时没有维护制作步骤。我先给你一个 AI 参考做法：\n${recipeReply}`
            : `数据库里暂时没有找到这道菜。我先给你一个 AI 参考做法：\n${recipeReply}`,
          toolCalls: [
            buildToolCall('search_dishes_by_name', {
              query: normalizedMessage,
            }),
            ...(dish
              ? [
                  buildToolCall('get_dish_steps', {
                    dishId: dish.id,
                    dishName: dish.name,
                  }),
                ]
              : []),
            buildToolCall('recipe_ollama_fallback', {
              reason: dish ? 'dish_found_but_no_steps' : 'dish_not_found',
              dishName: dish ? dish.name : cleanDishName(normalizedMessage),
            }),
          ],
        };
      }

      if (isRecommendIntent(normalizedMessage)) {
        const keyword = getRecommendationKeyword(normalizedMessage);
        let dishes = await DishModel.searchDishes(keyword);

        if (dishes.length === 0 && keyword !== '菜品') {
          dishes = await DishModel.searchDishes(normalizedMessage);
        }

        const inspiration = await invokeRecommendationInspiration(normalizedMessage, keyword, dishes);

        return {
          reply: formatHybridRecommendations(dishes, keyword, inspiration),
          toolCalls: [
            buildToolCall('search_dishes', {
              query: keyword,
              resultCount: dishes.length,
            }),
            buildToolCall('ai_recommendation_inspiration', {
              keyword,
            }),
          ],
        };
      }
      const safeChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
      const messages = [
        {
          role: 'system',
          content: '你是智能点餐助手。请用中文简洁回答。涉及购物车操作时，不要直接执行，只提示用户说出明确菜品ID。',
        },
        ...safeChatHistory
          .filter((msg) => msg && msg.content)
          .map((msg) => ({
            role: msg.type === 'ai' ? 'assistant' : 'user',
            content: String(msg.content),
          })),
        {
          role: 'user',
          content: normalizedMessage,
        },
      ];

      const reply = isDeepSeekConfigured()
        ? await callDeepSeek(messages)
        : await buildLocalAssistantReply();

      return {
        reply,
        toolCalls: [
          buildToolCall('deepseek_chat', {
            userId: normalizedUserId,
          }),
        ],
      };
    } catch (error) {
        console.error('Error in AgentService.chatWithAgent:', error);

        return {
          reply: '抱歉，AI 助手刚才处理失败了，但后端接口已连接。请稍后再试，或换一种说法提问。',
          toolCalls: [
            buildToolCall('agent_error_fallback', {
              message: error.message,
            }),
          ],
        };
      }
  },
};

module.exports = AgentService;