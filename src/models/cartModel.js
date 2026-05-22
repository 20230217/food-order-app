// d:\Uniapp\food-order-app\server\src\models\cartModel.js

const pool = require('../config/db');

const CartModel = {
  /**
   * 获取指定用户购物车中的所有商品
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 购物车商品列表
   */
  getCartItems: async (userId) => {
    const [rows] = await pool.query(
      'SELECT ci.dish_id, d.name, d.price, ci.quantity FROM cart_items ci JOIN dishes d ON ci.dish_id = d.id WHERE ci.user_id = ? ORDER BY ci.updated_at DESC',
      [userId]
    );

    return rows;
  },

  /**
   * 向购物车添加商品或累加商品数量
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @param {number} quantity - 增加数量
   * @returns {Promise<object>} 操作结果
   */
  addOrUpdateCartItem: async (userId, dishId, quantity) => {
    const [existingItem] = await pool.query(
      'SELECT quantity FROM cart_items WHERE user_id = ? AND dish_id = ?',
      [userId, dishId]
    );

    if (existingItem.length > 0) {
      const newQuantity = existingItem[0].quantity + quantity;

      const [result] = await pool.query(
        'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND dish_id = ?',
        [newQuantity, userId, dishId]
      );

      return result;
    }

    const [result] = await pool.query(
      'INSERT INTO cart_items (user_id, dish_id, quantity) VALUES (?, ?, ?)',
      [userId, dishId, quantity]
    );

    return result;
  },

  /**
   * 设置购物车中某个商品的数量
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @param {number} quantity - 新数量
   * @returns {Promise<object>} 操作结果
   */
  updateCartItemQuantity: async (userId, dishId, quantity) => {
    const [result] = await pool.query(
      'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND dish_id = ?',
      [quantity, userId, dishId]
    );

    return result;
  },

  /**
   * 从购物车中移除指定商品
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @returns {Promise<object>} 操作结果
   */
  removeCartItem: async (userId, dishId) => {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE user_id = ? AND dish_id = ?',
      [userId, dishId]
    );

    return result;
  },

  /**
   * 清空指定用户的购物车
   * @param {number} userId - 用户ID
   * @returns {Promise<object>} 操作结果
   */
  clearCart: async (userId) => {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );

    return result;
  },
};

module.exports = CartModel;