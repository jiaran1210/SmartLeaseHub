const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
const authRoutes = require('./routes/auth');
const houseRoutes = require('./routes/houses');
const tenantRoutes = require('./routes/tenants');
const contractRoutes = require('./routes/contracts');
const billRoutes = require('./routes/bills');
const meterRoutes = require('./routes/meters');
const paymentRoutes = require('./routes/payments');
const statsRoutes = require('./routes/stats');

app.use('/api/auth', authRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SmartLeaseHub API' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器错误' });
});

// 启动服务
async function startServer() {
  try {
    // 初始化数据库表
    await initDatabase();
    console.log('数据库初始化成功');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err.message);
    // 不退出，继续运行以便健康检查通过
  }
}

startServer();