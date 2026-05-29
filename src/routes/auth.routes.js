const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// 微信小程序登录：正式推荐用这个
router.post('/wechat-login', AuthController.wechatLogin);

// 模拟账号登录：备用，用于没有 AppID/AppSecret 时测试
router.post('/mock-login', AuthController.mockLogin);

router.post('/avatar', auth, AuthController.uploadAvatar);

// 获取当前登录用户，需要 token
router.get('/profile', auth, AuthController.getProfile);

// 更新当前登录用户资料，需要 token
// 用于保存微信头像和昵称
router.put('/profile', auth, AuthController.updateProfile);

module.exports = router;