// d:\Uniapp\food-order-app\server\src\agent\tools\addToCart.tool.js

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const CartService = require('../../services/cartService');

class AddToCartTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'add_to_cart',
      description: '将指定菜品添加到用户的购物车中。需要用户ID、菜品ID和数量。',
      schema: z.object({
        userId: z.number().describe('用户的唯一ID。'),
        dishId: z.number().describe('要添加到购物车的菜品的唯一ID。'),
        quantity: z.number().default(1).describe('要添加的菜品数量，默认为1。'),
      }),
      func: async ({ userId, dishId, quantity = 1 }) => {
        try {
          const success = await CartService.addToCart(userId, dishId, quantity);

          if (success) {
            return `已成功将 ${quantity} 份菜品ID为 ${dishId} 的商品添加到用户 ${userId} 的购物车。`;
          }

          return `添加菜品ID为 ${dishId} 到用户 ${userId} 的购物车失败。`;
        } catch (error) {
          console.error('Error in add_to_cart tool:', error);
          return `添加商品到购物车时发生错误: ${error.message}`;
        }
      },
    });
  }
}

module.exports = AddToCartTool;