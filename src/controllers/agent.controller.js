// d:\Uniapp\food-order-app\server\src\controllers\agent.controller.js

const AgentService = require('../services/agent.service');
const { successResponse, errorResponse } = require('../utils/response');

const AgentController = {
  /**
   * 处理 Agent 的聊天请求
   * POST /api/agent/chat
   */
  chat: async (req, res, next) => {
    try {
      const { userId, message, chatHistory } = req.body;

      if (!userId || !message) {
        return errorResponse(res, 400, 'userId and message are required');
      }

      const { reply, toolCalls } = await AgentService.chatWithAgent(userId, message, chatHistory);

      successResponse(res, 200, 'Agent chat successful', { reply, toolCalls });
    } catch (error) {
      next(error); // 传递给错误处理中间件
    }
  },
};

module.exports = AgentController;
