// d:\Uniapp\food-order-app\server\src\services\cartService.js

const CartModel = require('../models/cartModel');
const DishModel = require('../models/dishModel');

const CartService = {
  /**
   * 获取指定用户购物车中的所有商品
   * @param {number} userId - 用户ID
   * @returns {Promise<Array>} 购物车商品列表
   */
  getCartItems: async (userId) => {
    try {
      const cartItems = await CartModel.getCartItems(userId);
      return cartItems;
    } catch (error) {
      console.error(`Error in CartService.getCartItems for user ${userId}:`, error);
      throw new Error('Failed to retrieve cart items');
    }
  },

  /**
   * 向购物车添加商品
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @param {number} quantity - 数量
   * @returns {Promise<boolean>} 是否添加成功
   */
  addToCart: async (userId, dishId, quantity = 1) => {
    try {
      const dish = await DishModel.getDishById(dishId);

      if (!dish) {
        throw new Error(`Dish with ID ${dishId} not found`);
      }

      const result = await CartModel.addOrUpdateCartItem(userId, dishId, quantity);

      return result.affectedRows > 0 || result.insertId > 0;
    } catch (error) {
      console.error(`Error in CartService.addToCart for user ${userId}, dish ${dishId}:`, error);
      throw error;
    }
  },

  /**
   * 设置购物车商品数量
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @param {number} quantity - 新数量
   * @returns {Promise<boolean>} 是否成功
   */
  updateCartItem: async (userId, dishId, quantity) => {
    try {
      const normalizedQuantity = Number(quantity);

      if (!Number.isInteger(normalizedQuantity)) {
        throw new Error('数量必须为整数！');
      }

      if (normalizedQuantity <= 0) {
        const result = await CartModel.removeCartItem(userId, dishId);
        return result.affectedRows > 0;
      }

      const dish = await DishModel.getDishById(dishId);

      if (!dish) {
        throw new Error(`ID为 ${dishId} 的菜肴不存在！`);
      }

      const result = await CartModel.updateCartItemQuantity(userId, dishId, normalizedQuantity);

      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in CartService.updateCartItem for user ${userId}, dish ${dishId}:`, error);
      throw error;
    }
  },

  /**
   * 删除购物车某个商品
   * @param {number} userId - 用户ID
   * @param {number} dishId - 菜品ID
   * @returns {Promise<boolean>} 是否成功
   */
  removeCartItem: async (userId, dishId) => {
    try {
      const result = await CartModel.removeCartItem(userId, dishId);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in CartService.removeCartItem for user ${userId}, dish ${dishId}:`, error);
      throw new Error('Failed to remove cart item');
    }
  },

  /**
   * 清空指定用户的购物车
   * @param {number} userId - 用户ID
   * @returns {Promise<boolean>} 是否清空成功
   */
  clearCart: async (userId) => {
    try {
      const result = await CartModel.clearCart(userId);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in CartService.clearCart for user ${userId}:`, error);
      throw new Error('Failed to clear cart');
    }
  },
};

module.exports = CartService;