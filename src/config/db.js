// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: '123456',
//   database: 'foodlist',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// module.exports = pool;


const fs = require('fs');
const path = require('path');

const sqlJsModule = require('sql.js');
const initSqlJs = sqlJsModule.default || sqlJsModule;

const databaseFile = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'food-order.sqlite');

let dbPromise = null;
let schemaInitPromise = null;

const ensureDatabaseDir = () => {
  const dir = path.dirname(databaseFile);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const persistDatabase = (db) => {
  ensureDatabaseDir();
  fs.writeFileSync(databaseFile, Buffer.from(db.export()));
};

const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    }).then((SQL) => {
      if (fs.existsSync(databaseFile)) {
        return new SQL.Database(fs.readFileSync(databaseFile));
      }

      return new SQL.Database();
    });
  }

  return dbPromise;
};

const initializeSchema = async () => {
  const db = await getDatabase();

  db.run(`
    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      category_id INTEGER,
      category TEXT,
      image TEXT,
      rating REAL DEFAULT 0,
      cook_time INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT '简单',
      diet_type TEXT,
      ingredients TEXT
    );

    CREATE TABLE IF NOT EXISTS dish_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dish_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      openid TEXT UNIQUE,
      nickname TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, dish_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      share_code TEXT NOT NULL UNIQUE,
      total_amount REAL NOT NULL DEFAULT 0,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      remark TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      dish_name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_key TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT,
      payload TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conversation_created ON chat_messages(conversation_key, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_receiver_read ON chat_messages(receiver_id, is_read);
  `);

  persistDatabase(db);
};

const ensureSchemaInitialized = async () => {
  if (!schemaInitPromise) {
    schemaInitPromise = initializeSchema();
  }

  return schemaInitPromise;
};

const transformSql = (sql) => {
  let transformed = String(sql)
    .replace(/`/g, '')
    .replace(/BIGINT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/INT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/TINYINT/gi, 'INTEGER')
    .replace(/JSON/gi, 'TEXT')
    .replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '')
    .replace(/\s+AFTER\s+\w+/gi, '');

  if (/CREATE\s+TABLE/i.test(transformed)) {
    transformed = transformed
      .split('\n')
      .filter((line) => !/^\s*(INDEX|KEY)\s+/i.test(line.trim()))
      .join('\n')
      .replace(/,\s*\)/g, '\n)');
  }

  return transformed;
};

const normalizeParams = (params) => (Array.isArray(params) ? params : []);

const getTableColumns = async (tableName, likeName) => {
  const db = await getDatabase();
  await ensureSchemaInitialized();

  const result = db.exec(`PRAGMA table_info(${tableName})`);
  const rows = result.length
    ? result[0].values.map((row) => ({ Field: row[1] }))
    : [];

  if (!likeName) return rows;

  return rows.filter((row) => row.Field === likeName);
};

const all = (db, sql, params) => {
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows = [];

  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();

  return rows;
};

const run = (db, sql, params) => {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();

  const insertId = db.exec('SELECT last_insert_rowid() AS insertId')[0]?.values?.[0]?.[0] || 0;
  const affectedRows = db.getRowsModified();

  return { insertId, affectedRows };
};

const runQuery = async (sql, params = []) => {
  const db = await getDatabase();
  await ensureSchemaInitialized();

  const normalizedParams = normalizeParams(params);
  const rawSql = String(sql).trim();

  const showLikeMatch = rawSql.match(/^SHOW\s+COLUMNS\s+FROM\s+(\w+)\s+LIKE\s+\?/i);
  if (showLikeMatch) {
    return [await getTableColumns(showLikeMatch[1], normalizedParams[0])];
  }

  const showColumnsMatch = rawSql.match(/^SHOW\s+COLUMNS\s+FROM\s+(\w+)/i);
  if (showColumnsMatch) {
    return [await getTableColumns(showColumnsMatch[1])];
  }

  const transformedSql = transformSql(rawSql);

  if (/VALUES\s+\?/i.test(transformedSql) && Array.isArray(normalizedParams[0])) {
    const rows = normalizedParams[0];

    if (rows.length === 0) {
      return [{ insertId: 0, affectedRows: 0 }];
    }

    const columnCount = rows[0].length;
    const placeholders = rows
      .map(() => `(${Array(columnCount).fill('?').join(', ')})`)
      .join(', ');

    const expandedSql = transformedSql.replace(/VALUES\s+\?/i, `VALUES ${placeholders}`);
    const result = run(db, expandedSql, rows.flat());

    persistDatabase(db);

    return [result];
  }

  if (/^\s*SELECT\b/i.test(transformedSql) || /^\s*PRAGMA\b/i.test(transformedSql)) {
    return [all(db, transformedSql, normalizedParams)];
  }

  const result = run(db, transformedSql, normalizedParams);

  persistDatabase(db);

  return [result];
};

const createConnection = async () => {
  const db = await getDatabase();
  await ensureSchemaInitialized();

  return {
    query: runQuery,

    beginTransaction: async () => {
      db.run('BEGIN TRANSACTION');
    },

    commit: async () => {
      db.run('COMMIT');
      persistDatabase(db);
    },

    rollback: async () => {
      db.run('ROLLBACK');
    },

    release: () => {},
  };
};

module.exports = {
  query: runQuery,
  getConnection: createConnection,
};