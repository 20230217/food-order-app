// d:\Uniapp\food-order-app\server\src\controllers\dishController.js

const DishService = require('../services/dishService');
const { successResponse, errorResponse } = require('../utils/response');

const DishController = {
  /**
   * 获取所有菜品
   * GET /api/dishes
   */
  getAllDishes: async (req, res, next) => {
    try {
      const dishes = await DishService.getAllDishes();
      successResponse(res, 200, 'Dishes retrieved successfully', dishes);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 根据ID获取菜品
   * GET /api/dishes/:id
   */
  getDishById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const dish = await DishService.getDishById(id);

      if (dish) {
        successResponse(res, 200, `Dish with ID ${id} retrieved successfully`, dish);
      } else {
        errorResponse(res, 404, `Dish with ID ${id} not found`);
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * 获取菜品制作步骤
   * GET /api/dishes/:id/steps
   */
  getDishStepsById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const dish = await DishService.getDishById(id);

      if (!dish) {
        return errorResponse(res, 404, `Dish with ID ${id} not found`);
      }

      const steps = await DishService.getDishStepsById(id);

      successResponse(res, 200, `Dish steps with ID ${id} retrieved successfully`, {
        dish,
        steps,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * 创建新菜品
   * POST /api/dishes
   */
  createDish: async (req, res, next) => {
    try {
      const dishData = req.body;

      if (!dishData.name || !dishData.price) {
        return errorResponse(res, 400, 'Dish name and price are required');
      }

      const newDish = await DishService.createDish(dishData);
      successResponse(res, 201, 'Dish created successfully', newDish);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 更新菜品
   * PUT /api/dishes/:id
   */
  updateDish: async (req, res, next) => {
    try {
      const { id } = req.params;
      const dishData = req.body;
      const updated = await DishService.updateDish(id, dishData);

      if (updated) {
        successResponse(res, 200, `Dish with ID ${id} updated successfully`);
      } else {
        errorResponse(res, 404, `Dish with ID ${id} not found or no changes made`);
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * 删除菜品
   * DELETE /api/dishes/:id
   */
  deleteDish: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await DishService.deleteDish(id);

      if (deleted) {
        successResponse(res, 200, `Dish with ID ${id} deleted successfully`);
      } else {
        errorResponse(res, 404, `Dish with ID ${id} not found`);
      }
    } catch (error) {
      next(error);
    }
  },
};

module.exports = DishController;