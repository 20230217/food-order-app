// d:\Uniapp\food-order-app\server\src\routes\dishRoutes.js

const express = require('express');
const router = express.Router();
const DishController = require('../controllers/dishController');

// 获取所有菜品
router.get('/', DishController.getAllDishes);

// 获取菜品制作步骤
router.get('/:id/steps', DishController.getDishStepsById);

// 根据ID获取菜品
router.get('/:id', DishController.getDishById);

// 创建新菜品
router.post('/', DishController.createDish);

// 更新菜品
router.put('/:id', DishController.updateDish);

// 删除菜品
router.delete('/:id', DishController.deleteDish);

module.exports = router;