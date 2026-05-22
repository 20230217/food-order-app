// d:\Uniapp\food-order-app\server\src\agent\tools\searchDishes.tool.js

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const DishModel = require('../../models/dishModel');

class SearchDishesTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'search_dishes',
      description: '根据关键词搜索菜品，可以根据菜品名称或描述进行模糊查询。',
      schema: z.object({
        query: z.string().describe('要搜索的菜品关键词，例如“麻辣”、“低脂”、“面条”等。'),
      }),
      func: async ({ query }) => {
        try {
          const dishes = await DishModel.searchDishes(query);

          if (dishes.length > 0) {
            return JSON.stringify(dishes);
          }

          return '没有找到符合条件的菜品。';
        } catch (error) {
          console.error('Error in search_dishes tool:', error);
          return `搜索菜品时发生错误: ${error.message}`;
        }
      },
    });
  }
}

module.exports = SearchDishesTool;