// d:\Uniapp\food-order-app\server\src\services\dishService.js

const DishModel = require('../models/dishModel');

const DishService = {
  /**
   * 获取所有菜品
   * @returns {Promise<Array>} 菜品列表
   */
  getAllDishes: async () => {
    try {
      const dishes = await DishModel.getAllDishes();
      return dishes;
    } catch (error) {
      console.error('Error in DishService.getAllDishes:', error);
      throw new Error('Failed to retrieve dishes');
    }
  },

  /**
   * 根据ID获取菜品
   * @param {number} id - 菜品ID
   * @returns {Promise<object|null>} 菜品对象或null
   */
  getDishById: async (id) => {
    try {
      const dish = await DishModel.getDishById(id);
      return dish;
    } catch (error) {
      console.error(`Error in DishService.getDishById for ID ${id}:`, error);
      throw new Error(`Failed to retrieve dish with ID ${id}`);
    }
  },

  /**
   * 获取菜品制作步骤
   * @param {number} id - 菜品ID
   * @returns {Promise<Array>} 步骤列表
   */
  getDishStepsById: async (id) => {
    try {
      const steps = await DishModel.getDishStepsById(id);
      return steps;
    } catch (error) {
      console.error(`Error in DishService.getDishStepsById for ID ${id}:`, error);
      throw new Error(`Failed to retrieve dish steps with ID ${id}`);
    }
  },

  /**
   * 创建新菜品
   * @param {object} dishData - 菜品数据
   * @returns {Promise<object>} 新创建菜品的信息
   */
  createDish: async (dishData) => {
    try {
      const result = await DishModel.createDish(dishData);
      return { id: result.insertId, ...dishData };
    } catch (error) {
      console.error('Error in DishService.createDish:', error);
      throw new Error('Failed to create dish');
    }
  },

  /**
   * 更新菜品
   * @param {number} id - 菜品ID
   * @param {object} dishData - 更新的菜品数据
   * @returns {Promise<boolean>} 是否更新成功
   */
  updateDish: async (id, dishData) => {
    try {
      const result = await DishModel.updateDish(id, dishData);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in DishService.updateDish for ID ${id}:`, error);
      throw new Error(`Failed to update dish with ID ${id}`);
    }
  },

  /**
   * 删除菜品
   * @param {number} id - 菜品ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  deleteDish: async (id) => {
    try {
      const result = await DishModel.deleteDish(id);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in DishService.deleteDish for ID ${id}:`, error);
      throw new Error(`Failed to delete dish with ID ${id}`);
    }
  },
};

module.exports = DishService;