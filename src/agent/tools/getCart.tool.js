// d:\Uniapp\food-order-app\server\src\agent\tools\getCart.tool.js

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const CartService = require('../../services/cartService');

class GetCartTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'get_cart',
      description: '获取指定用户的购物车内容。',
      schema: z.object({
        userId: z.number().describe('用户的唯一ID。'),
      }),
      func: async ({ userId }) => {
        try {
          const cartItems = await CartService.getCartItems(userId);

          if (cartItems && cartItems.length > 0) {
            return JSON.stringify(cartItems);
          }

          return `用户 ${userId} 的购物车是空的。`;
        } catch (error) {
          console.error('Error in get_cart tool:', error);
          return `获取购物车内容时发生错误: ${error.message}`;
        }
      },
    });
  }
}

module.exports = GetCartTool;