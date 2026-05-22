// d:\Uniapp\food-order-app\server\src\agent\tools\getDishDetail.tool.js

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const DishModel = require('../../models/dishModel');

class GetDishDetailTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'get_dish_detail',
      description: '根据菜品ID获取菜品的详细信息。',
      schema: z.object({
        dishId: z.number().describe('要查询的菜品的唯一ID。'),
      }),
      func: async ({ dishId }) => {
        try {
          const dish = await DishModel.getDishById(dishId);

          if (dish) {
            return JSON.stringify(dish);
          }

          return `未找到ID为 ${dishId} 的菜品。`;
        } catch (error) {
          console.error('Error in get_dish_detail tool:', error);
          return `获取菜品详情时发生错误: ${error.message}`;
        }
      },
    });
  }
}

module.exports = GetDishDetailTool;