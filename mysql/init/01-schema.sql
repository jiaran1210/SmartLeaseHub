-- SmartLeaseHub 数据库初始化脚本
-- 这个脚本会在容器首次启动时自动执行

CREATE DATABASE IF NOT EXISTS smartleasehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smartleasehub;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建房屋表
CREATE TABLE IF NOT EXISTS houses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  rooms VARCHAR(50),
  area DECIMAL(10,2),
  status VARCHAR(20) DEFAULT '空置中',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建租户表
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_house_id (house_id),
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建合同表
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_house_id (house_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建费用记录表
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_house_id (house_id),
  INDEX idx_tenant_id (tenant_id),
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建水电煤读数表
CREATE TABLE IF NOT EXISTS meter_readings (
  id VARCHAR(36) PRIMARY KEY,
  house_id VARCHAR(36) NOT NULL,
  type VARCHAR(10) NOT NULL,
  reading DECIMAL(10,2) NOT NULL,
  reading_date DATE NOT NULL,
  usage DECIMAL(10,2),
  cost DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_house_id (house_id),
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建房租缴纳记录表
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_house_id (house_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;