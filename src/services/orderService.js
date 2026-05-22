// d:\Uniapp\food-order-app\server\src\services\orderService.js

const OrderModel = require('../models/orderModel');
const CartService = require('./cartService');
const CartModel = require('../models/cartModel');

const generateShareCode = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `ORD${timestamp}${random}`;
};

const summarizeCartItems = (items) => {
  const totalQuantity = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  const totalAmount = items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  return {
    totalQuantity,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

const OrderService = {
  /**
   * 从购物车创建共享订单
   * @param {number} userId - 创建用户ID
   * @param {string} remark - 备注
   * @returns {Promise<object>} 订单信息
   */
  createOrderFromCart: async (userId, remark = '') => {
    const cartItems = await CartService.getCartItems(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    const summary = summarizeCartItems(cartItems);
    const shareCode = generateShareCode();

    const orderResult = await OrderModel.createOrder({
      userId,
      shareCode,
      totalAmount: summary.totalAmount,
      totalQuantity: summary.totalQuantity,
      remark,
    });

    const orderId = orderResult.insertId;

    await OrderModel.createOrderItems(orderId, cartItems);

    await CartModel.clearCart(userId);

    return {
      orderId,
      shareCode,
      totalAmount: summary.totalAmount,
      totalQuantity: summary.totalQuantity,
      remark,
      items: cartItems,
    };
  },

  /**
   * 根据分享码获取共享订单详情
   * @param {string} shareCode - 分享码
   * @returns {Promise<object|null>} 订单详情
   */
  getSharedOrderByCode: async (shareCode) => {
    const order = await OrderModel.getOrderByShareCode(shareCode);

    if (!order) {
      return null;
    }

    const items = await OrderModel.getOrderItemsByOrderId(order.id);

    return {
      ...order,
      items,
    };
  },

  /**
   * 获取用户订单列表
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 订单列表
   */
  getOrdersByUserId: async (userId) => {
    const orders = await OrderModel.getOrdersByUserId(userId);
    return orders;
  },

    /**
   * 更新订单状态
   * @param {number} orderId - 订单ID
   * @param {string} status - 订单状态
   * @returns {Promise<boolean>} 是否更新成功
   */
  updateOrderStatus: async (orderId, status) => {
    const allowedStatuses = ['pending', 'viewed', 'cooking', 'completed'];

    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }

    const result = await OrderModel.updateOrderStatus(orderId, status);

    return result.affectedRows > 0;
  },
};

module.exports = OrderService;