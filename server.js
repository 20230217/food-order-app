// d:\Uniapp\food-order-app\server\server.js
require('dotenv').config();

const http = require('http');
const app = require('./src/app'); // 引入 Express 应用
const pool = require('./src/config/db'); // 引入数据库连接池
const { registerChatSocketServer } = require('./src/realtime/chatSocket');

const PORT = process.env.PORT || 3000;

// 用 Node 原生 http server 包一层 Express app。
// 这样同一个 3000 端口既能处理 /api 请求，也能处理 WebSocket upgrade。
const server = http.createServer(app);

// 注册聊天 WebSocket 服务，监听 ws://127.0.0.1:3000/ws/chat
registerChatSocketServer(server);

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);

  // 尝试连接数据库，验证数据库配置是否正确
  pool.getConnection()
    .then(connection => {
      console.log('Successfully initialized SQLite database!');
      connection.release(); // 释放连接
    })
    .catch(err => {
      console.error('Failed to initialize SQLite database:', err.message);
      // 如果数据库连接失败，可以选择退出应用或进行其他错误处理
      // process.exit(1);
    });
});