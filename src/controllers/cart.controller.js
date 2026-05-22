// d:\Uniapp\food-order-app\server\src\controllers\cart.controller.js

const CartService = require('../services/cartService');
const { successResponse, errorResponse } = require('../utils/response');

const formatCartSummary = (items) => {
  const totalQuantity = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  const totalAmount = items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  return {
    items,
    totalQuantity,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

const getLatestCart = async (userId) => {
  const items = await CartService.getCartItems(Number(userId));
  return formatCartSummary(items);
};

const CartController = {
  /**
   * 获取购物车
   * GET /api/cart/:userId
   */
  getCart: async (req, res, next) => {
    try {
      // 不再从 URL 参数拿 userId
      // 当前用户来自 auth 中间件解析出来的 token
      const userId = req.user.id;

      const cart = await getLatestCart(userId);

      successResponse(res, 200, 'Cart retrieved successfully', cart);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 添加购物车
   * POST /api/cart/add
   */
  addToCart: async (req, res, next) => {
    try {
      // userId 不再相信前端传值，直接使用当前登录用户
      const userId = req.user.id;

      // 前端只需要传 dishId 和 quantity
      const { dishId, quantity = 1 } = req.body;

      if (!dishId) {
        return errorResponse(res, 400, 'dishId is required');
      }

      const normalizedQuantity = Number(quantity);

      if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
        return errorResponse(res, 400, 'quantity must be a positive integer');
      }

      await CartService.addToCart(Number(userId), Number(dishId), normalizedQuantity);

      const cart = await getLatestCart(userId);

      successResponse(res, 200, 'Dish added to cart successfully', cart);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 更新购物车商品数量
   * PUT /api/cart/update
   */
  updateCartItem: async (req, res, next) => {
    try {
      // 当前登录用户
      const userId = req.user.id;

      // 前端只传 dishId 和 quantity
      const { dishId, quantity } = req.body;

      if (!dishId || quantity === undefined) {
        return errorResponse(res, 400, 'dishId and quantity are required');
      }

      const normalizedQuantity = Number(quantity);

      if (!Number.isInteger(normalizedQuantity)) {
        return errorResponse(res, 400, 'quantity must be an integer');
      }

      await CartService.updateCartItem(Number(userId), Number(dishId), normalizedQuantity);

      const cart = await getLatestCart(userId);

      successResponse(res, 200, 'Cart item updated successfully', cart);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 删除购物车单个商品
   * DELETE /api/cart/remove
   */
  removeCartItem: async (req, res, next) => {
    try {
      // 当前登录用户
      const userId = req.user.id;

      // 前端只传 dishId
      const { dishId } = req.body;

      if (!dishId) {
        return errorResponse(res, 400, 'dishId is required');
      }

      await CartService.removeCartItem(Number(userId), Number(dishId));

      const cart = await getLatestCart(userId);

      successResponse(res, 200, 'Cart item removed successfully', cart);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 清空购物车
   * DELETE /api/cart/clear/:userId
   */
  clearCart: async (req, res, next) => {
    try {
      // 当前登录用户
      const userId = req.user.id;

      await CartService.clearCart(Number(userId));

      successResponse(res, 200, 'Cart cleared successfully', {
        items: [],
        totalQuantity: 0,
        totalAmount: 0,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = CartController;