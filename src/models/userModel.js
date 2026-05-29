const pool = require('../config/db');

const getColumnNames = async () => {
  const [columns] = await pool.query('SHOW COLUMNS FROM users');
  return columns.map((column) => column.Field);
};

const ensureColumn = async (columnNames, columnName, sql) => {
  if (!columnNames.includes(columnName)) {
    await pool.query(sql);
    columnNames.push(columnName);
  }
};

const ensureUsersTable = async () => {
  // 新库会创建完整 users 表。
  // 老库如果已经有 users 表，则后面会补缺失字段。
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
       id INT PRIMARY KEY AUTO_INCREMENT,
       username VARCHAR(64) NULL UNIQUE,
       password VARCHAR(128) NULL,
       openid VARCHAR(128) NULL UNIQUE,
       nickname VARCHAR(64),
       avatar_url TEXT,
       avatar TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     )`
  );

  const columnNames = await getColumnNames();

  // 兼容旧账号密码字段，保留但允许为空。
  await ensureColumn(
    columnNames,
    'username',
    'ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL UNIQUE AFTER id'
  );

  await ensureColumn(
    columnNames,
    'password',
    'ALTER TABLE users ADD COLUMN password VARCHAR(128) NULL AFTER username'
  );

  // 微信登录核心字段：openid。
  await ensureColumn(
    columnNames,
    'openid',
    'ALTER TABLE users ADD COLUMN openid VARCHAR(128) NULL UNIQUE AFTER password'
  );

  await ensureColumn(
    columnNames,
    'nickname',
    'ALTER TABLE users ADD COLUMN nickname VARCHAR(64) AFTER openid'
  );

  await ensureColumn(
    columnNames,
    'avatar_url',
    'ALTER TABLE users ADD COLUMN avatar_url TEXT AFTER nickname'
  );

  await ensureColumn(
    columnNames,
    'avatar',
    'ALTER TABLE users ADD COLUMN avatar TEXT AFTER avatar_url'
  );

  await ensureColumn(
    columnNames,
    'created_at',
    'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  );

  await ensureColumn(
    columnNames,
    'updated_at',
    'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  );
};

const selectUserFields = `
  id,
  username,
  password,
  openid,
  nickname,
  COALESCE(NULLIF(avatar_url, ''), NULLIF(avatar, ''), '') AS avatarUrl,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const UserModel = {
  findByOpenid: async (openid) => {
    await ensureUsersTable();

    const [rows] = await pool.query(
      `SELECT ${selectUserFields}
       FROM users
       WHERE openid = ?`,
      [openid]
    );

    return rows[0] || null;
  },

  findByUsername: async (username) => {
    await ensureUsersTable();

    const [rows] = await pool.query(
      `SELECT ${selectUserFields}
       FROM users
       WHERE username = ?`,
      [username]
    );

    return rows[0] || null;
  },

  createUser: async ({ username, password, openid, nickname, avatarUrl }) => {
    await ensureUsersTable();

    // 微信登录时 username/password 可以为空；
    // 账号密码登录时 username/password 有值。
    const [result] = await pool.query(
      `INSERT INTO users (username, password, openid, nickname, avatar_url, avatar)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        username || null,
        password || null,
        openid || null,
        nickname || username || '微信用户',
        avatarUrl || null,
      ]
    );

    return result;
  },

  updateProfile: async ({ id, nickname, avatarUrl }) => {
    await ensureUsersTable();

    const [result] = await pool.query(
      `UPDATE users
       SET nickname = ?, avatar_url = ?, avatar = ?
       WHERE id = ?`,
      [nickname || null, avatarUrl || null, avatarUrl || null, id]
    );

    return result;
  },

  findById: async (id) => {
    await ensureUsersTable();

    const [rows] = await pool.query(
      `SELECT ${selectUserFields}
       FROM users
       WHERE id = ?`,
      [id]
    );

    return rows[0] || null;
  },
};

module.exports = UserModel;