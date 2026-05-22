const MessageModel = require('../models/messageModel');

const toPositiveInteger = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const buildConversationKey = (userA, userB) => {
  const ids = [Number(userA), Number(userB)].sort((a, b) => a - b);
  return `${ids[0]}_${ids[1]}`;
};

const parsePayload = (payload) => {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;

  try {
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
};

const formatMessage = (message) => {
  if (!message) return null;

  return {
    ...message,
    payload: parsePayload(message.payload),
  };
};

const MessageService = {
  sendMessage: async ({ senderId, receiverId, type = 'text', content = '', payload = null }) => {
    const normalizedSenderId = toPositiveInteger(senderId);
    const normalizedReceiverId = toPositiveInteger(receiverId);

    if (!normalizedSenderId || !normalizedReceiverId) {
      throw new Error('Invalid senderId or receiverId');
    }

    if (!['text', 'order_card'].includes(type)) {
      throw new Error('Invalid message type');
    }

    const normalizedContent = String(content || '').trim();

    if (type === 'text' && !normalizedContent) {
      throw new Error('Message content is required');
    }

    const conversationKey = buildConversationKey(normalizedSenderId, normalizedReceiverId);

    const result = await MessageModel.createMessage({
      conversationKey,
      senderId: normalizedSenderId,
      receiverId: normalizedReceiverId,
      type,
      content: normalizedContent,
      payload,
    });

    return formatMessage(await MessageModel.getMessageById(result.insertId));
  },

  getUserConversations: async ({ userId }) => {
    const normalizedUserId = toPositiveInteger(userId);

    if (!normalizedUserId) {
      throw new Error('Invalid userId');
    }

    const conversations = await MessageModel.getUserConversations(normalizedUserId);

    return conversations.map((conversation) => {
      const formattedMessage = formatMessage(conversation);
      const peerId = Number(conversation.senderId) === normalizedUserId
        ? Number(conversation.receiverId)
        : Number(conversation.senderId);

      return {
        conversationKey: conversation.conversationKey,
        peerId,
        unreadCount: Number(conversation.unreadCount || 0),
        latestMessage: formattedMessage,
      };
    });
  },

  getConversationMessages: async ({ userA, userB, currentUserId, limit = 100 }) => {
    const normalizedUserA = toPositiveInteger(userA);
    const normalizedUserB = toPositiveInteger(userB);

    if (!normalizedUserA || !normalizedUserB) {
      throw new Error('Invalid conversation users');
    }

    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const conversationKey = buildConversationKey(normalizedUserA, normalizedUserB);
    const normalizedCurrentUserId = toPositiveInteger(currentUserId);

    if (normalizedCurrentUserId) {
      await MessageModel.markConversationAsRead(conversationKey, normalizedCurrentUserId);
    }

    const messages = await MessageModel.getConversationMessages(conversationKey, normalizedLimit);

    return messages.map(formatMessage);
  },
};

module.exports = MessageService;