// d:\Uniapp\food-order-app\server\src\controllers\order.controller.js

const OrderService = require('../services/orderService');
const { successResponse, errorResponse } = require('../utils/response');

const OrderController = {
  /**
   * 从购物车创建共享订单
   * POST /api/orders/create-from-cart
   */
  createFromCart: async (req, res, next) => {
    try {
      // 当前登录用户来自 auth 中间件。
      // 这里不要再相信前端传来的 userId，否则会出现 userId 不存在导致外键错误。
      const userId = req.user.id;

      // 前端只需要传备注，不需要传 userId
      const { remark } = req.body;

      // 用当前登录用户的购物车生成共享订单
      const order = await OrderService.createOrderFromCart(Number(userId), remark);

      successResponse(res, 201, 'Shared order created successfully', order);
    } catch (error) {
      if (error.message === 'Cart is empty') {
        return errorResponse(res, 400, '购物车为空，无法生成共享订单');
      }

      next(error);
    }
  },

  /**
   * 根据分享码查看共享订单
   * GET /api/orders/share/:shareCode
   */
  getSharedOrder: async (req, res, next) => {
    try {
      const { shareCode } = req.params;

      if (!shareCode) {
        return errorResponse(res, 400, 'shareCode is required');
      }

      const order = await OrderService.getSharedOrderByCode(shareCode);

      if (!order) {
        return errorResponse(res, 404, '共享订单不存在');
      }

      successResponse(res, 200, 'Shared order retrieved successfully', order);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 获取用户订单列表
   * GET /api/orders/user/:userId
   */
  getUserOrders: async (req, res, next) => {
    try {
      // 只查询当前登录用户自己的订单。
      // 不再从 req.params 里拿 userId。
      const userId = req.user.id;

      const orders = await OrderService.getOrdersByUserId(Number(userId));

      successResponse(res, 200, 'Orders retrieved successfully', orders);
    } catch (error) {
      next(error);
    }
  },

    /**
   * 更新订单状态
   * PUT /api/orders/:orderId/status
   */
  updateOrderStatus: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!orderId || !status) {
        return errorResponse(res, 400, 'orderId and status are required');
      }

      const updated = await OrderService.updateOrderStatus(Number(orderId), status);

      if (!updated) {
        return errorResponse(res, 404, '订单不存在或状态未更新');
      }

      successResponse(res, 200, 'Order status updated successfully', {
        orderId: Number(orderId),
        status,
      });
    } catch (error) {
      if (error.message === 'Invalid order status') {
        return errorResponse(res, 400, '无效的订单状态');
      }

      next(error);
    }
  },
};

module.exports = OrderController;