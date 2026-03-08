require('dotenv').config();
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// 模拟 better-sqlite3 的 prepare API
function prepare(sql) {
  return {
    get: async (...params) => {
      const pool = await getPool();
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    },
    all: async (...params) => {
      const pool = await getPool();
      const result = await pool.query(sql, params);
      return result.rows;
    },
    run: async (...params) => {
      const pool = await getPool();
      await pool.query(sql, params);
    }
  };
}

// 初始化数据库表
async function initDatabase() {
  const db = await getPool();

  // 创建用户表
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建房屋表
  await db.query(`
    CREATE TABLE IF NOT EXISTS houses (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      address VARCHAR(255),
      rooms VARCHAR(50),
      area DECIMAL(10,2),
      status VARCHAR(20) DEFAULT '空置中',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引和外键
  await db.query(`CREATE INDEX IF NOT EXISTS idx_houses_user_id ON houses(user_id)`);
  await db.query(`ALTER TABLE houses DROP CONSTRAINT IF EXISTS fk_houses_user`);
  await db.query(`ALTER TABLE houses ADD CONSTRAINT fk_houses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);

  // 创建租户表
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(36) PRIMARY KEY,
      house_id VARCHAR(36) NOT NULL,
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      id_card VARCHAR(50),
      emergency_contact VARCHAR(50),
      emergency_phone VARCHAR(20),
      move_in_date DATE NOT NULL,
      lease_end_date DATE NOT NULL,
      monthly_rent DECIMAL(10,2) NOT NULL,
      deposit DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_tenants_house_id ON tenants(house_id)`);
  await db.query(`ALTER TABLE tenants DROP CONSTRAINT IF EXISTS fk_tenants_house`);
  await db.query(`ALTER TABLE tenants ADD CONSTRAINT fk_tenants_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE`);

  // 创建合同表
  await db.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      house_id VARCHAR(36) NOT NULL,
      contract_no VARCHAR(50) UNIQUE NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      monthly_rent DECIMAL(10,2) NOT NULL,
      deposit DECIMAL(10,2) DEFAULT 0,
      contract_file VARCHAR(500),
      status VARCHAR(20) DEFAULT '生效',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_contracts_house_id ON contracts(house_id)`);
  await db.query(`ALTER TABLE contracts DROP CONSTRAINT IF EXISTS fk_contracts_tenant`);
  await db.query(`ALTER TABLE contracts DROP CONSTRAINT IF EXISTS fk_contracts_house`);
  await db.query(`ALTER TABLE contracts ADD CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
  await db.query(`ALTER TABLE contracts ADD CONSTRAINT fk_contracts_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE`);

  // 创建费用记录表
  await db.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id VARCHAR(36) PRIMARY KEY,
      house_id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36),
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      bill_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT '未缴纳',
      paid_date DATE,
      remark VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_bills_house_id ON bills(house_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bills_tenant_id ON bills(tenant_id)`);
  await db.query(`ALTER TABLE bills DROP CONSTRAINT IF EXISTS fk_bills_house`);
  await db.query(`ALTER TABLE bills DROP CONSTRAINT IF EXISTS fk_bills_tenant`);
  await db.query(`ALTER TABLE bills ADD CONSTRAINT fk_bills_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE`);
  await db.query(`ALTER TABLE bills ADD CONSTRAINT fk_bills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL`);

  // 创建水电煤读数表
  await db.query(`
    CREATE TABLE IF NOT EXISTS meter_readings (
      id VARCHAR(36) PRIMARY KEY,
      house_id VARCHAR(36) NOT NULL,
      type VARCHAR(10) NOT NULL,
      reading DECIMAL(10,2) NOT NULL,
      reading_date DATE NOT NULL,
      usage_amount DECIMAL(10,2),
      cost DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_meter_readings_house_id ON meter_readings(house_id)`);
  await db.query(`ALTER TABLE meter_readings DROP CONSTRAINT IF EXISTS fk_meter_readings_house`);
  await db.query(`ALTER TABLE meter_readings ADD CONSTRAINT fk_meter_readings_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE`);

  // 创建房租缴纳记录表
  await db.query(`
    CREATE TABLE IF NOT EXISTS rent_payments (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      house_id VARCHAR(36) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      payment_method VARCHAR(50),
      remark VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id ON rent_payments(tenant_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_rent_payments_house_id ON rent_payments(house_id)`);
  await db.query(`ALTER TABLE rent_payments DROP CONSTRAINT IF EXISTS fk_rent_payments_tenant`);
  await db.query(`ALTER TABLE rent_payments DROP CONSTRAINT IF EXISTS fk_rent_payments_house`);
  await db.query(`ALTER TABLE rent_payments ADD CONSTRAINT fk_rent_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
  await db.query(`ALTER TABLE rent_payments ADD CONSTRAINT fk_rent_payments_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE`);

  console.log('数据库初始化完成');
}

// 查询封装
function query(sql, params = []) {
  return getPool().query(sql, params);
}

module.exports = {
  getPool,
  initDatabase,
  query,
  prepare
};