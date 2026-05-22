const MessageService = require('../services/messageService');
const { successResponse, errorResponse } = require('../utils/response');
const { broadcastMessage } = require('../realtime/chatSocket');

const badRequestMessages = [
  'Invalid senderId or receiverId',
  'Invalid message type',
  'Message content is required',
  'Invalid conversation users',
  'Invalid userId',
];

const MessageController = {
  sendMessage: async (req, res, next) => {
    try {
      // 1. 先把消息保存到数据库
      const message = await MessageService.sendMessage(req.body);

      // 2. 保存成功后，通过 WebSocket 通知发送方和接收方
      broadcastMessage(message);

      // 3. HTTP 请求仍然正常返回
      successResponse(res, 201, 'Message sent successfully', message);
    } catch (error) {
      if (badRequestMessages.includes(error.message)) {
        return errorResponse(res, 400, error.message);
      }

      next(error);
    }
  },

  getUserConversations: async (req, res, next) => {
    try {
      const conversations = await MessageService.getUserConversations(req.query);

      successResponse(res, 200, 'Conversations retrieved successfully', conversations);
    } catch (error) {
      if (badRequestMessages.includes(error.message)) {
        return errorResponse(res, 400, error.message);
      }

      next(error);
    }
  },

  getConversationMessages: async (req, res, next) => {
    try {
      const messages = await MessageService.getConversationMessages(req.query);

      successResponse(res, 200, 'Messages retrieved successfully', messages);
    } catch (error) {
      if (badRequestMessages.includes(error.message)) {
        return errorResponse(res, 400, error.message);
      }

      next(error);
    }
  },
};

module.exports = MessageController;