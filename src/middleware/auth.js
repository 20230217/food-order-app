const { verifyToken } = require('../utils/token');
const UserModel = require('../models/userModel');
const { errorResponse } = require('../utils/response');

const auth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    // 前端会传：Authorization: Bearer token
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';

    const payload = verifyToken(token);

    if (!payload || !payload.userId) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const user = await UserModel.findById(payload.userId);

    if (!user) {
      return errorResponse(res, 401, 'User not found');
    }

    // 后续 controller/service 可以从 req.user 里拿当前用户
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = auth;