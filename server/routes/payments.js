const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取房租缴纳记录
router.get('/', async (req, res) => {
  try {
    const { house_id, tenant_id, year } = req.query;

    let query = `
      SELECT rp.*, h.name as house_name, t.name as tenant_name, t.phone as tenant_phone
      FROM rent_payments rp
      LEFT JOIN houses h ON rp.house_id = h.id
      LEFT JOIN tenants t ON rp.tenant_id = t.id
      WHERE h.user_id = $1
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND rp.house_id = $' + (params.length + 1);
      params.push(house_id);
    }

    if (tenant_id) {
      query += ' AND rp.tenant_id = $' + (params.length + 1);
      params.push(tenant_id);
    }

    if (year) {
      query += " AND TO_CHAR(rp.payment_date, 'YYYY') = $" + (params.length + 1);
      params.push(year);
    }

    query += ' ORDER BY rp.payment_date DESC';

    const payments = await db.prepare(query).all(...params);

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取缴纳记录失败' });
  }
});

// 新增房租缴纳
router.post('/', async (req, res) => {
  try {
    const { tenant_id, house_id, amount, payment_date, period_start, period_end, payment_method, remark } = req.body;

    if (!tenant_id || !house_id || !amount || !payment_date || !period_start || !period_end) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋和租户
    const house = await db.prepare('SELECT id FROM houses WHERE id = $1 AND user_id = $2')
      .get(house_id, req.userId);

    const tenant = await db.prepare('SELECT id FROM tenants WHERE id = $1').get(tenant_id);

    if (!house || !tenant) {
      return res.status(404).json({ error: '房屋或租户不存在' });
    }

    const paymentId = uuidv4();

    await db.prepare(`
      INSERT INTO rent_payments (id, tenant_id, house_id, amount, payment_date, period_start, period_end, payment_method, remark)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `).run(paymentId, tenant_id, house_id, amount, payment_date, period_start, period_end, payment_method || '', remark || '');

    const payment = await db.prepare('SELECT * FROM rent_payments WHERE id = $1').get(paymentId);

    res.json({ message: '添加成功', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加缴纳记录失败' });
  }
});

// 删除房租缴纳记录
router.delete('/:id', async (req, res) => {
  try {
    // 检查记录是否存在且房屋属于当前用户
    const payment = await db.prepare(`
      SELECT rp.* FROM rent_payments rp
      LEFT JOIN houses h ON rp.house_id = h.id
      WHERE rp.id = $1 AND h.user_id = $2
    `).get(req.params.id, req.userId);

    if (!payment) {
      return res.status(404).json({ error: '缴纳记录不存在' });
    }

    await db.prepare('DELETE FROM rent_payments WHERE id = $1').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除记录失败' });
  }
});

module.exports = router;