const pool = require('../config/db');

const ensureChatMessagesTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_messages (
       id BIGINT PRIMARY KEY AUTO_INCREMENT,
       conversation_key VARCHAR(64) NOT NULL,
       sender_id INT NOT NULL,
       receiver_id INT NOT NULL,
       type VARCHAR(32) NOT NULL DEFAULT 'text',
       content TEXT,
       payload JSON,
       is_read TINYINT NOT NULL DEFAULT 0,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       INDEX idx_conversation_created (conversation_key, created_at),
       INDEX idx_receiver_read (receiver_id, is_read)
     )`
  );
};

const MessageModel = {
  createMessage: async ({ conversationKey, senderId, receiverId, type, content, payload }) => {
    await ensureChatMessagesTable();

    const [result] = await pool.query(
      `INSERT INTO chat_messages
       (conversation_key, sender_id, receiver_id, type, content, payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        conversationKey,
        senderId,
        receiverId,
        type,
        content || null,
        payload ? JSON.stringify(payload) : null,
      ]
    );

    return result;
  },

  getMessageById: async (id) => {
    await ensureChatMessagesTable();

    const [rows] = await pool.query(
      `SELECT
         id,
         conversation_key AS conversationKey,
         sender_id AS senderId,
         receiver_id AS receiverId,
         type,
         content,
         payload,
         is_read AS isRead,
         created_at AS createdAt
       FROM chat_messages
       WHERE id = ?`,
      [id]
    );

    return rows[0] || null;
  },

  getConversationMessages: async (conversationKey, limit) => {
    await ensureChatMessagesTable();

    const [rows] = await pool.query(
      `SELECT
         id,
         conversation_key AS conversationKey,
         sender_id AS senderId,
         receiver_id AS receiverId,
         type,
         content,
         payload,
         is_read AS isRead,
         created_at AS createdAt
       FROM chat_messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
      [conversationKey, limit]
    );

    return rows;
  },

  markConversationAsRead: async (conversationKey, receiverId) => {
    await ensureChatMessagesTable();

    const [result] = await pool.query(
      `UPDATE chat_messages
       SET is_read = 1
       WHERE conversation_key = ?
         AND receiver_id = ?`,
      [conversationKey, receiverId]
    );

    return result;
  },

  getUserConversations: async (userId) => {
    await ensureChatMessagesTable();

    const [rows] = await pool.query(
      `SELECT
        cm.id,
        cm.conversation_key AS conversationKey,
        cm.sender_id AS senderId,
        cm.receiver_id AS receiverId,
        cm.type,
        cm.content,
        cm.payload,
        cm.is_read AS isRead,
        cm.created_at AS createdAt,
        unread.unread_count AS unreadCount
      FROM chat_messages cm
      JOIN (
        SELECT conversation_key, MAX(id) AS latest_id
        FROM chat_messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY conversation_key
      ) latest ON latest.latest_id = cm.id
      LEFT JOIN (
        SELECT conversation_key, COUNT(*) AS unread_count
        FROM chat_messages
        WHERE receiver_id = ? AND is_read = 0
        GROUP BY conversation_key
      ) unread ON unread.conversation_key = cm.conversation_key
      ORDER BY cm.created_at DESC, cm.id DESC`,
      [userId, userId, userId]
    );

    return rows;
  },
};

module.exports = MessageModel;