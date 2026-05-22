// d:\Uniapp\food-order-app\server\src\routes\order.routes.js

const express = require('express');
const router = express.Router();

const OrderController = require('../controllers/order.controller');

// 引入登录校验中间件
// auth 会解析请求头里的 Authorization: Bearer token
// 然后把当前登录用户放到 req.user
const auth = require('../middleware/auth');

// 从当前登录用户的购物车创建共享订单。
// userId 不再由前端传入，而是由 auth 中间件从 token 解析后放到 req.user。
router.post('/create-from-cart', auth, OrderController.createFromCart);

// 分享详情允许通过分享码查看，所以这里暂时不强制登录。
router.get('/share/:shareCode', OrderController.getSharedOrder);

// 获取当前登录用户的订单列表。
// 不再使用 /user/:userId，避免前端随便传别人的 userId。
router.get('/user', auth, OrderController.getUserOrders);

// 更新订单状态也需要登录，避免未登录用户随意改状态。
router.put('/:orderId/status', auth, OrderController.updateOrderStatus);

module.exports = router;