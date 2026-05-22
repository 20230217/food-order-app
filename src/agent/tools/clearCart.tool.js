// d:\Uniapp\food-order-app\server\src\agent\tools\clearCart.tool.js

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const CartService = require('../../services/cartService');

class ClearCartTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: 'clear_cart',
      description: '清空指定用户的购物车。',
      schema: z.object({
        userId: z.number().describe('要清空购物车的用户的唯一ID。'),
      }),
      func: async ({ userId }) => {
        try {
          const success = await CartService.clearCart(userId);

          if (success) {
            return `已成功清空用户 ${userId} 的购物车。`;
          }

          return `清空用户 ${userId} 的购物车失败。`;
        } catch (error) {
          console.error('Error in clear_cart tool:', error);
          return `清空购物车时发生错误: ${error.message}`;
        }
      },
    });
  }
}

module.exports = ClearCartTool;