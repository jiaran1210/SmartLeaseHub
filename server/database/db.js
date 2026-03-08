/**
 * 数据库适配层
 * 封装 mysql2 为类似 better-sqlite3 的 API
 */

const { query } = require('./init');

// 预处理语句缓存
const preparedCache = new Map();

class PreparedStatement {
  constructor(sql) {
    this.sql = sql;
  }

  async run(...params) {
    const [result] = await query(this.sql, params);
    return result;
  }

  async get(...params) {
    const [rows] = await query(this.sql, params);
    return rows[0] || null;
  }

  async all(...params) {
    const [rows] = await query(this.sql, params);
    return rows;
  }
}

function prepare(sql) {
  // 如果缓存中有，直接返回
  if (preparedCache.has(sql)) {
    return preparedCache.get(sql);
  }

  // 创建新的预处理语句
  const stmt = new PreparedStatement(sql);
  preparedCache.set(sql, stmt);
  return stmt;
}

// 兼容旧代码的快捷方法
function get(sql, params) {
  return prepare(sql).get(...(params || []));
}

function all(sql, params) {
  return prepare(sql).all(...(params || []));
}

function run(sql, params) {
  return prepare(sql).run(...(params || []));
}

module.exports = {
  prepare,
  get,
  all,
  run,
  query
};