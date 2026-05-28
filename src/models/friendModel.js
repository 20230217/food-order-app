const pool = require('../config/db');

const userFields = `
  id,
  username,
  nickname,
  avatar_url AS avatarUrl,
  openid
`;

const normalizeId = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const FriendModel = {
  searchUsers: async ({ keyword, currentUserId }) => {
    const normalizedUserId = normalizeId(currentUserId);
    const searchText = `%${String(keyword || '').trim()}%`;

    if (!normalizedUserId || searchText === '%%') return [];

    const [rows] = await pool.query(
      `SELECT ${userFields}
       FROM users
       WHERE id != ?
         AND (
           CAST(id AS TEXT) LIKE ?
           OR username LIKE ?
           OR nickname LIKE ?
           OR openid LIKE ?
         )
       ORDER BY id ASC
       LIMIT 20`,
      [normalizedUserId, searchText, searchText, searchText, searchText]
    );

    return rows;
  },

  findUserById: async (userId) => {
    const normalizedUserId = normalizeId(userId);

    if (!normalizedUserId) return null;

    const [rows] = await pool.query(
      `SELECT ${userFields}
       FROM users
       WHERE id = ?`,
      [normalizedUserId]
    );

    return rows[0] || null;
  },

  areFriends: async (userId, friendId) => {
    const [rows] = await pool.query(
      `SELECT id
       FROM friendships
       WHERE user_id = ? AND friend_id = ?`,
      [userId, friendId]
    );

    return rows.length > 0;
  },

  findRequestBetween: async (fromUserId, toUserId) => {
    const [rows] = await pool.query(
      `SELECT *
       FROM friend_requests
       WHERE from_user_id = ? AND to_user_id = ?`,
      [fromUserId, toUserId]
    );

    return rows[0] || null;
  },

  createRequest: async ({ fromUserId, toUserId, message }) => {
    const [result] = await pool.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status, message)
       VALUES (?, ?, 'pending', ?)`,
      [fromUserId, toUserId, message || null]
    );

    return result;
  },

  updateRequestToPending: async ({ requestId, message }) => {
    const [result] = await pool.query(
      `UPDATE friend_requests
       SET status = 'pending',
           message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [message || null, requestId]
    );

    return result;
  },

  getReceivedRequests: async (userId) => {
    const [rows] = await pool.query(
      `SELECT
         fr.id,
         fr.from_user_id AS fromUserId,
         fr.to_user_id AS toUserId,
         fr.status,
         fr.message,
         fr.created_at AS createdAt,
         u.username,
         u.nickname,
         u.avatar_url AS avatarUrl
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    return rows;
  },

  getSentRequests: async (userId) => {
    const [rows] = await pool.query(
      `SELECT
         fr.id,
         fr.from_user_id AS fromUserId,
         fr.to_user_id AS toUserId,
         fr.status,
         fr.message,
         fr.created_at AS createdAt,
         u.username,
         u.nickname,
         u.avatar_url AS avatarUrl
       FROM friend_requests fr
       JOIN users u ON u.id = fr.to_user_id
       WHERE fr.from_user_id = ?
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    return rows;
  },

  findRequestById: async (requestId) => {
    const [rows] = await pool.query(
      `SELECT *
       FROM friend_requests
       WHERE id = ?`,
      [requestId]
    );

    return rows[0] || null;
  },

  acceptRequest: async ({ requestId, fromUserId, toUserId }) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE friend_requests
         SET status = 'accepted',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [requestId]
      );

      await connection.query(
        `INSERT OR IGNORE INTO friendships (user_id, friend_id)
         VALUES (?, ?)`,
        [fromUserId, toUserId]
      );

      await connection.query(
        `INSERT OR IGNORE INTO friendships (user_id, friend_id)
         VALUES (?, ?)`,
        [toUserId, fromUserId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  rejectRequest: async (requestId) => {
    const [result] = await pool.query(
      `UPDATE friend_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [requestId]
    );

    return result;
  },

  getFriends: async (userId) => {
    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.nickname,
         u.avatar_url AS avatarUrl,
         f.created_at AS friendCreatedAt
       FROM friendships f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return rows;
  },

  deleteFriend: async ({ userId, friendId }) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `DELETE FROM friendships
         WHERE user_id = ? AND friend_id = ?`,
        [userId, friendId]
      );

      await connection.query(
        `DELETE FROM friendships
         WHERE user_id = ? AND friend_id = ?`,
        [friendId, userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = FriendModel;