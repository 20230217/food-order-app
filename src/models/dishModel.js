// d:\Uniapp\food-order-app\server\src\models\dishModel.js

const pool = require('../config/db');

let dishSchemaReady = false;

/**
 * 确保菜品相关数据库结构存在：
 * 1. dishes 表有 ingredients 字段，用来保存配料
 * 2. dish_steps 表存在，用来保存制作步骤
 */
const ensureDishSchema = async () => {
  if (dishSchemaReady) return;

  const [columns] = await pool.query('SHOW COLUMNS FROM dishes LIKE ?', ['ingredients']);

  if (columns.length === 0) {
    await pool.query('ALTER TABLE dishes ADD COLUMN ingredients TEXT NULL');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dish_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dish_id INT NOT NULL,
      step_order INT NOT NULL,
      content TEXT NOT NULL
    )
  `);

  dishSchemaReady = true;
};

const DishModel = {
  /**
   * 获取所有菜品
   * @returns {Promise<Array>} 菜品列表
   */
  getAllDishes: async () => {
    await ensureDishSchema();
    const [rows] = await pool.query('SELECT * FROM dishes');
    return rows;
  },

  /**
   * 根据关键词搜索菜品
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} 匹配的菜品列表
   */
  searchDishes: async (query) => {
    const searchQuery = `%${query}%`;

    const [rows] = await pool.query(
      'SELECT * FROM dishes WHERE name LIKE ? OR description LIKE ? OR category LIKE ? OR diet_type LIKE ?',
      [searchQuery, searchQuery, searchQuery, searchQuery]
    );

    return rows;
  },

  /**
   * 根据菜品名称模糊搜索菜品
   * 用于识别“清蒸鲈鱼怎么做”“番茄炒蛋步骤”等问题
   * @param {string} name - 菜品名称关键词
   * @returns {Promise<Array>} 匹配的菜品列表
   */
  searchDishesByName: async (name) => {
    const searchQuery = `%${name}%`;

    const [rows] = await pool.query(
      `SELECT *
       FROM dishes
       WHERE name LIKE ?
       ORDER BY
         CASE
           WHEN name = ? THEN 1
           WHEN name LIKE ? THEN 2
           ELSE 3
         END,
         id ASC`,
      [searchQuery, name, `${name}%`]
    );

    return rows;
  },

  /**
   * 根据ID获取菜品
   * @param {number} id - 菜品ID
   * @returns {Promise<object|null>} 菜品对象或null
   */
  getDishById: async (id) => {
    await ensureDishSchema();
    const [rows] = await pool.query('SELECT * FROM dishes WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * 获取菜品制作步骤
   * @param {number} id - 菜品ID
   * @returns {Promise<Array>} 步骤列表
   */
  getDishStepsById: async (id) => {
    await ensureDishSchema();
    const [rows] = await pool.query(
      `SELECT
         id,
         dish_id AS dishId,
         step_order AS stepOrder,
         content
       FROM dish_steps
       WHERE dish_id = ?
       ORDER BY step_order ASC`,
      [id]
    );

    return rows;
  },


    /**
   * 创建新菜品，同时保存配料和制作步骤
   * @param {object} dishData - 菜品数据
   * @returns {Promise<object>} 新创建菜品的信息
   */
  createDish: async (dishData) => {
    const {
      name,
      description,
      price,
      category_id,
      category,
      image,
      rating,
      cook_time,
      difficulty,
      diet_type,
      ingredients,
      steps = [], // 前端传过来的制作步骤数组
    } = dishData;

    await ensureDishSchema();

    // 使用事务：保证菜品和步骤要么一起成功，要么一起失败
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO dishes
        (name, description, price, category_id, category, image, rating, cook_time, difficulty, diet_type, ingredients)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          price,
          category_id || null,
          category || null,
          image || null,
          rating || 0,
          cook_time || 0,
          difficulty || '简单',
          diet_type || null,
          ingredients || null,
        ]
      );
      const dishId = result.insertId;
      // 过滤空步骤，并按顺序写入 dish_steps 表
      const stepRows = Array.isArray(steps)
        ? steps
            .map((step, index) => [dishId, index + 1, String(step || '').trim()])
            .filter((step) => step[2])
        : [];

      if (stepRows.length > 0) {
        await connection.query(
          'INSERT INTO dish_steps (dish_id, step_order, content) VALUES ?',
          [stepRows]
        );
      }
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 更新菜品
   * @param {number} id - 菜品ID
   * @param {object} dishData - 更新的菜品数据
   * @returns {Promise<object>} 更新结果
   */
  updateDish: async (id, dishData) => {
    const {
      name,
      description,
      price,
      category_id,
      category,
      image,
      rating,
      cook_time,
      difficulty,
      diet_type,
    } = dishData;

    const [result] = await pool.query(
      `UPDATE dishes
       SET name = ?,
           description = ?,
           price = ?,
           category_id = ?,
           category = ?,
           image = ?,
           rating = ?,
           cook_time = ?,
           difficulty = ?,
           diet_type = ?
       WHERE id = ?`,
      [
        name,
        description,
        price,
        category_id || null,
        category || null,
        image || null,
        rating || 0,
        cook_time || 0,
        difficulty || '简单',
        diet_type || null,
        id,
      ]
    );

    return result;
  },

  /**
   * 删除菜品
   * @param {number} id - 菜品ID
   * @returns {Promise<object>} 删除结果
   */
  deleteDish: async (id) => {
    const [result] = await pool.query('DELETE FROM dishes WHERE id = ?', [id]);
    return result;
  },
};

module.exports = DishModel;