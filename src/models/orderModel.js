// d:\Uniapp\food-order-app\server\src\models\orderModel.js

const pool = require('../config/db');

const OrderModel = {
  /**
   * 创建订单
   * @param {object} orderData - 订单数据
   * @param {number} orderData.userId - 用户ID
   * @param {string} orderData.shareCode - 分享码
   * @param {number} orderData.totalAmount - 总金额
   * @param {number} orderData.totalQuantity - 总数量
   * @param {string} orderData.remark - 备注
   * @returns {Promise<object>} 创建结果
   */
  createOrder: async ({ userId, shareCode, totalAmount, totalQuantity, remark }) => {
    const [result] = await pool.query(
      `INSERT INTO orders
       (user_id, share_code, total_amount, total_quantity, status, remark)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, shareCode, totalAmount, totalQuantity, 'pending', remark || null]
    );

    return result;
  },

  /**
   * 批量创建订单明细
   * @param {number} orderId - 订单ID
   * @param {Array} items - 购物车菜品
   * @returns {Promise<object>} 创建结果
   */
  createOrderItems: async (orderId, items) => {
    const values = items.map((item) => [
      orderId,
      item.dish_id,
      item.name,
      item.price,
      item.quantity,
    ]);

    const [result] = await pool.query(
      `INSERT INTO order_items
       (order_id, dish_id, dish_name, price, quantity)
       VALUES ?`,
      [values]
    );

    return result;
  },

  /**
   * 根据分享码获取订单
   * @param {string} shareCode - 分享码
   * @returns {Promise<object|null>} 订单信息
   */
  getOrderByShareCode: async (shareCode) => {
    const [rows] = await pool.query(
      `SELECT
         o.id,
         o.user_id AS userId,
         COALESCE(u.nickname, u.username, '微信用户') AS creatorName,
         u.avatar_url AS creatorAvatarUrl,
         o.share_code AS shareCode,
         o.total_amount AS totalAmount,
         o.total_quantity AS totalQuantity,
         o.status,
         o.remark,
         o.created_at AS createdAt
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.share_code = ?`,
      [shareCode]
    );

    return rows[0] || null;
  },

  /**
   * 根据订单ID获取订单明细
   * @param {number} orderId - 订单ID
   * @returns {Promise<Array>} 订单明细
   */
  getOrderItemsByOrderId: async (orderId) => {
    const [rows] = await pool.query(
      `SELECT
         oi.id,
         oi.order_id AS orderId,
         oi.dish_id AS dishId,
         oi.dish_name AS dishName,
         oi.price,
         oi.quantity,
         d.description,
         d.category,
         d.image,
         d.rating,
         d.cook_time AS cookTime,
         d.difficulty,
         d.diet_type AS dietType
       FROM order_items oi
       JOIN dishes d ON oi.dish_id = d.id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [orderId]
    );

    return rows;
  },

  /**
   * 根据用户ID获取订单列表
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 订单列表
   */
  getOrdersByUserId: async (userId) => {
    const [rows] = await pool.query(
      `SELECT
         o.id,
         o.user_id AS userId,
         COALESCE(u.nickname, u.username, '微信用户') AS creatorName,
         u.avatar_url AS creatorAvatarUrl,
         o.share_code AS shareCode,
         o.total_amount AS totalAmount,
         o.total_quantity AS totalQuantity,
         o.status,
         o.remark,
         o.created_at AS createdAt
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return rows;
  },

  /**
   * 更新订单状态
   * @param {number} orderId - 订单ID
   * @param {string} status - 订单状态
   * @returns {Promise<object>} 更新结果
   */
  updateOrderStatus: async (orderId, status) => {
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    return result;
  },
};

module.exports = OrderModel;