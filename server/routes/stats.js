const express = require('express');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取年度收入统计
router.get('/yearly', (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear().toString();

    // 按房屋统计年度收入
    const houseStats = db.prepare(`
      SELECT
        h.id,
        h.name as house_name,
        COALESCE(SUM(rp.amount), 0) as total_income
      FROM houses h
      LEFT JOIN rent_payments rp ON h.id = rp.house_id
        AND strftime('%Y', rp.payment_date) = '` + targetYear + `'
      WHERE h.user_id = ?
      GROUP BY h.id
      ORDER BY total_income DESC
    `).all(req.userId);

    // 月度收入趋势
    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%m', rp.payment_date) as month,
        COALESCE(SUM(rp.amount), 0) as income
      FROM rent_payments rp
      LEFT JOIN houses h ON rp.house_id = h.id
      WHERE h.user_id = ? AND strftime('%Y', rp.payment_date) = '` + targetYear + `'
      GROUP BY month
      ORDER BY month
    `).all(req.userId);

    // 汇总信息
    const summary = db.prepare(`
      SELECT
        COUNT(DISTINCT h.id) as house_count,
        COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tenant_count,
        COALESCE(SUM(rp.amount), 0) as total_income
      FROM houses h
      LEFT JOIN tenants t ON h.id = t.house_id AND t.status = 'active'
      LEFT JOIN rent_payments rp ON h.id = rp.house_id
        AND strftime('%Y', rp.payment_date) = '` + targetYear + `'
      WHERE h.user_id = ?
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
router.get('/houses/summary', (req, res) => {
  try {
    const houses = db.prepare(`
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
      WHERE h.user_id = ?
      GROUP BY h.id
    `).all(req.userId);

    res.json({ houses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取房屋汇总失败' });
  }
});

// 获取即将到期提醒
router.get('/reminders', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // 合同即将到期
    const expiringContracts = db.prepare(`
      SELECT c.*, h.name as house_name, t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE h.user_id = ? AND c.status = '生效' AND c.end_date <= ?
      ORDER BY c.end_date ASC
    `).all(req.userId, futureDate.toISOString().split('T')[0]);

    // 房租即将到期（基于最后缴纳记录）
    const upcomingRent = db.prepare(`
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
      WHERE h.user_id = ? AND t.status = 'active'
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
router.get('/expenses', (req, res) => {
  try {
    const { house_id, year, type } = req.query;

    let query = `
      SELECT
        strftime('%Y', b.bill_date) as year,
        strftime('%m', b.bill_date) as month,
        b.type,
        COALESCE(SUM(b.amount), 0) as total_amount
      FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      WHERE h.user_id = ?
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND b.house_id = ?';
      params.push(house_id);
    }

    if (year) {
      query += " AND strftime('%Y', b.bill_date) = '" + year + "'";
    }

    if (type) {
      query += ' AND b.type = ?';
      params.push(type);
    }

    query += ' GROUP BY year, month, type ORDER BY year DESC, month DESC';

    const expenses = db.prepare(query).all(...params);

    res.json({ expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取费用统计失败' });
  }
});

module.exports = router;