// d:\Uniapp\food-order-app\server\src\agent\foodAgent.js

// const { ChatOllama } = require('@langchain/ollama');
const { AgentExecutor, createOpenAIToolsAgent } = require('langchain/agents');
const { AIMessage, HumanMessage } = require('@langchain/core/messages');

const foodAgentPrompt = require('./prompts/foodAgent.prompt');
const SearchDishesTool = require('./tools/searchDishes.tool');
const GetDishDetailTool = require('./tools/getDishDetail.tool');
const AddToCartTool = require('./tools/addToCart.tool');
const GetCartTool = require('./tools/getCart.tool');
const ClearCartTool = require('./tools/clearCart.tool');

// 初始化语言模型
// 确保您已设置 OPENAI_API_KEY 环境变量
const { ChatOllama } = require('@langchain/community/chat_models/ollama');

const llm = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  temperature: 0,
});

// 实例化所有工具
const tools = [
  new SearchDishesTool(),
  new GetDishDetailTool(),
  new AddToCartTool(),
  new GetCartTool(),
  new ClearCartTool(),
];

// 创建 Agent
let agentExecutorPromise = null;

const getAgentExecutor = async () => {
  if (!agentExecutorPromise) {
    agentExecutorPromise = createOpenAIToolsAgent({
      llm,
      tools,
      prompt: foodAgentPrompt,
    }).then((agent) => {
      return new AgentExecutor({
        agent,
        tools,
        verbose: process.env.NODE_ENV === 'development',
      });
    });
  }

  return agentExecutorPromise;
};

/**
 * 调用 Food Agent 进行对话
 * @param {number} userId - 用户ID
 * @param {string} message - 用户消息
 * @param {Array<AIMessage|HumanMessage>} chatHistory - 聊天历史
 * @returns {Promise<object>} Agent 的回复和工具调用信息
 */
const invokeFoodAgent = async (userId, message, chatHistory = []) => {
  try {
    const agentExecutor = await getAgentExecutor();

    const result = await agentExecutor.invoke({
      input: message,
      chat_history: chatHistory,
      userId,
    });

    const reply = result.output;
    const toolCalls = result.tool_calls || [];

    return { reply, toolCalls };
  } catch (error) {
    console.error('Error invoking Food Agent:', error);
    return { reply: '抱歉，Agent 在处理您的请求时遇到了问题。', toolCalls: [] };
  }
};

module.exports = invokeFoodAgent;
