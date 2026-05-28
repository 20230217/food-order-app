const pool = require('../config/db');

const userSelectFields = (alias, prefix) => `
  ${alias}.id AS ${prefix}Id,
  ${alias}.username AS ${prefix}Username,
  ${alias}.nickname AS ${prefix}Nickname,
  ${alias}.avatar_url AS ${prefix}AvatarUrl,
  ${alias}.avatar AS ${prefix}Avatar
`;

const normalizeMessageRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    conversationKey: row.conversationKey,
    senderId: row.senderId,
    receiverId: row.receiverId,
    type: row.type,
    content: row.content,
    payload: row.payload,
    isRead: row.isRead,
    createdAt: row.createdAt,
    unreadCount: row.unreadCount,
    sender: {
      id: row.senderUserId || row.senderId,
      username: row.senderUserUsername,
      nickname: row.senderUserNickname,
      avatarUrl: row.senderUserAvatarUrl || row.senderUserAvatar || '',
    },
    receiver: {
      id: row.receiverUserId || row.receiverId,
      username: row.receiverUserUsername,
      nickname: row.receiverUserNickname,
      avatarUrl: row.receiverUserAvatarUrl || row.receiverUserAvatar || '',
    },
  };
};

const messageSelectFields = `
  cm.id,
  cm.conversation_key AS conversationKey,
  cm.sender_id AS senderId,
  cm.receiver_id AS receiverId,
  cm.type,
  cm.content,
  cm.payload,
  cm.is_read AS isRead,
  cm.created_at AS createdAt,
  ${userSelectFields('sender', 'senderUser')},
  ${userSelectFields('receiver', 'receiverUser')}
`;

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
      `SELECT ${messageSelectFields}
      FROM chat_messages cm
      LEFT JOIN users sender ON sender.id = cm.sender_id
      LEFT JOIN users receiver ON receiver.id = cm.receiver_id
      WHERE cm.id = ?`,
      [id]
    );

    return normalizeMessageRow(rows[0]);
  },

  getConversationMessages: async (conversationKey, limit) => {
    await ensureChatMessagesTable();

    const [rows] = await pool.query(
      `SELECT ${messageSelectFields}
      FROM chat_messages cm
      LEFT JOIN users sender ON sender.id = cm.sender_id
      LEFT JOIN users receiver ON receiver.id = cm.receiver_id
      WHERE cm.conversation_key = ?
      ORDER BY cm.created_at ASC, cm.id ASC
      LIMIT ?`,
      [conversationKey, limit]
    );

    return rows.map(normalizeMessageRow);
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