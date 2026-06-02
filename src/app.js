// d:\Uniapp\food-order-app\server\src\app.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const dishRoutes = require('./routes/dishRoutes'); // 引入菜品路由
const agentRoutes = require('./routes/agent.routes'); // 引入 Agent 路由
const cartRoutes = require('./routes/cart.routes'); // 引入购物车路由
const orderRoutes = require('./routes/order.routes'); // 引入订单路由
const messageRoutes = require('./routes/message.routes'); // 引入聊天消息路由
const authRoutes = require('./routes/auth.routes'); // 引入登录路由
const friendRoutes = require('./routes/friend.routes'); // 引入好友路由
const app = express();

app.set('trust proxy', true);
// 中间件
app.use(cors()); // 启用 CORS
app.use(logger); // 请求日志
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// 示例路由
app.get('/', (req, res) => {
  res.send('Hello from Food Order App Backend!');
});

// 登录路由
app.use('/api/auth', authRoutes);

// 菜品路由
app.use('/api/dishes', dishRoutes);

// Agent 路由
app.use('/api/agent', agentRoutes);

// 购物车路由
app.use('/api/cart', cartRoutes);

// 订单路由
app.use('/api/orders', orderRoutes);

// 聊天消息路由
app.use('/api/messages', messageRoutes);

// 好友路由
app.use('/api/friends', friendRoutes);

// 错误处理中间件 (必须放在所有路由之后)
app.use(errorHandler);

module.exports = app;
