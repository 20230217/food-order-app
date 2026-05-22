// d:\Uniapp\food-order-app\server\src\utils\response.js

/**
 * 统一的成功响应格式
 * @param {object} res - Express 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 成功消息
 * @param {object} data - 响应数据
 */
const successResponse = (res, statusCode, message, data = {}) => {
  res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
  });
};

/**
 * 统一的错误响应格式
 * @param {object} res - Express 响应对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误消息
 * @param {object} errorDetails - 错误详情 (可选)
 */
const errorResponse = (res, statusCode, message, errorDetails = {}) => {
  res.status(statusCode).json({
    success: false,
    message: message,
    error: errorDetails,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
