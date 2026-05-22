const express = require('express');
const router = express.Router();

const CartController = require('../controllers/cart.controller');
const auth = require('../middleware/auth');

// 所有购物车接口都需要登录
// auth 中间件会从 Authorization token 中解析当前用户，并放到 req.user
router.get('/', auth, CartController.getCart);

router.post('/add', auth, CartController.addToCart);

router.put('/update', auth, CartController.updateCartItem);

router.delete('/remove', auth, CartController.removeCartItem);

router.delete('/clear', auth, CartController.clearCart);

module.exports = router;