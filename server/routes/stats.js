const express = require('express');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取年度收入统计
router.get('/yearly', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear().toString();

    // 按房屋统计年度收入
    const houseStats = await db.prepare(`
      SELECT
        h.id,
        h.name as house_name,
        COALESCE(SUM(rp.amount), 0) as total_income
      FROM houses h
      LEFT JOIN rent_payments rp ON h.id = rp.house_id
        AND TO_CHAR(rp.payment_date, 'YYYY') = '` + targetYear + `'
      WHERE h.user_id = $1
      GROUP BY h.id
      ORDER BY total_income DESC
    `).all(req.userId);

    // 月度收入趋势
    const monthlyTrend = await db.prepare(`
      SELECT
        TO_CHAR(rp.payment_date, 'MM') as month,
        COALESCE(SUM(rp.amount), 0) as income
      FROM rent_payments rp
      LEFT JOIN houses h ON rp.house_id = h.id
      WHERE h.user_id = $1 AND TO_CHAR(rp.payment_date, 'YYYY') = '` + targetYear + `'
      GROUP BY month
      ORDER BY month
    `).all(req.userId);

    // 汇总信息
    const summary = await db.prepare(`
      SELECT
        COUNT(DISTINCT h.id) as house_count,
        COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tenant_count,
        COALESCE(SUM(rp.amount), 0) as total_income
      FROM houses h
      LEFT JOIN tenants t ON h.id = t.house_id AND t.status = 'active'
      LEFT JOIN rent_payments rp ON h.id = rp.house_id
        AND TO_CHAR(rp.payment_date, 'YYYY') = '` + targetYear + `'
      WHERE h.user_id = $1
    `).get(req.userId);

    res.json({
      year: targetYear,
      summary,
      houseStats,
      monthlyTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取年度统计失败' });
  }
});

// 获取房屋汇总信息
router.get('/houses/summary', async (req, res) => {
  try {
    const houses = await db.prepare(`
      SELECT
        h.id,
        h.name as house_name,
        h.status,
        COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as tenant_count,
        COALESCE(SUM(rp.amount), 0) as total_income,
        COALESCE((SELECT SUM(amount) FROM bills b WHERE b.house_id = h.id AND b.status = '已缴纳'), 0) as total_bills
      FROM houses h
      LEFT JOIN tenants t ON h.id = t.house_id
      LEFT JOIN rent_payments rp ON h.id = rp.house_id
      WHERE h.user_id = $1
      GROUP BY h.id
    `).all(req.userId);

    res.json({ houses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取房屋汇总失败' });
  }
});

// 获取即将到期提醒
router.get('/reminders', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // 合同即将到期
    const expiringContracts = await db.prepare(`
      SELECT c.*, h.name as house_name, t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE h.user_id = $1 AND c.status = '生效' AND c.end_date <= $2
      ORDER BY c.end_date ASC
    `).all(req.userId, futureDate.toISOString().split('T')[0]);

    // 房租即将到期（基于最后缴纳记录）
    const upcomingRent = await db.prepare(`
      SELECT DISTINCT
        t.id as tenant_id,
        t.name as tenant_name,
        t.phone as tenant_phone,
        t.lease_end_date,
        h.id as house_id,
        h.name as house_name,
        t.monthly_rent,
        (SELECT payment_date FROM rent_payments rp
         WHERE rp.tenant_id = t.id
         ORDER BY payment_date DESC LIMIT 1) as last_payment_date
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE h.user_id = $1 AND t.status = 'active'
    `).all(req.userId);

    res.json({
      expiringContracts,
      upcomingRent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取提醒失败' });
  }
});

// 获取费用统计
router.get('/expenses', async (req, res) => {
  try {
    const { house_id, year, type } = req.query;

    let query = `
      SELECT
        TO_CHAR(b.bill_date, 'YYYY') as year,
        TO_CHAR(b.bill_date, 'MM') as month,
        b.type,
        COALESCE(SUM(b.amount), 0) as total_amount
      FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      WHERE h.user_id = $1
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND b.house_id = $' + (params.length + 1);
      params.push(house_id);
    }

    if (year) {
      query += " AND TO_CHAR(b.bill_date, 'YYYY') = '" + year + "'";
    }

    if (type) {
      query += ' AND b.type = $' + (params.length + 1);
      params.push(type);
    }

    query += ' GROUP BY year, month, type ORDER BY year DESC, month DESC';

    const expenses = await db.prepare(query).all(...params);

    res.json({ expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取费用统计失败' });
  }
});

module.exports = router;