// d:\Uniapp\food-order-app\server\src\middleware\errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // 在控制台输出错误堆栈，便于调试

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      // 在开发环境中可以包含更多错误信息，生产环境应避免暴露敏感信息
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
