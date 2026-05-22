const AuthService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');

const AuthController = {
  wechatLogin: async (req, res, next) => {
    try {
      const { code, nickname, avatarUrl } = req.body;

      if (!code) {
        return errorResponse(res, 400, 'code is required');
      }

      const result = await AuthService.wechatLogin({
        code,
        nickname,
        avatarUrl,
      });

      successResponse(res, 200, 'Wechat login successfully', result);
    } catch (error) {
      if (
        error.message === 'Missing WECHAT_APPID or WECHAT_SECRET' ||
        error.message === 'Wechat openid is empty' ||
        error.message === 'code is required'
      ) {
        return errorResponse(res, 400, error.message);
      }

      next(error);
    }
  },

  // mock-login 保留备用：没有微信 AppID/Secret 时还能测业务
  mockLogin: async (req, res, next) => {
    try {
      const { username, nickname, password, avatarUrl } = req.body;

      if (!username && !nickname) {
        return errorResponse(res, 400, 'username is required');
      }

      if (!password) {
        return errorResponse(res, 400, 'password is required');
      }

      const result = await AuthService.mockLogin({
        username,
        nickname,
        password,
        avatarUrl,
      });

      successResponse(res, 200, 'Login successfully', result);
    } catch (error) {
      if (error.message === 'Invalid username or password') {
        return errorResponse(res, 401, error.message);
      }

      next(error);
    }
  },

  getProfile: async (req, res) => {
    successResponse(res, 200, 'Profile retrieved successfully', req.user);
  },

  updateProfile: async (req, res, next) => {
    try {
      // req.user 来自 auth 中间件，表示当前登录用户
      const userId = req.user.id;

      // 前端传过来的昵称和头像
      const { nickname, avatarUrl } = req.body;

      if (!nickname && !avatarUrl) {
        return errorResponse(res, 400, 'nickname or avatarUrl is required');
      }

      const user = await AuthService.updateProfile({
        userId,
        nickname,
        avatarUrl,
      });

      successResponse(res, 200, 'Profile updated successfully', user);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;