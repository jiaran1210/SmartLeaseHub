const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取账单列表
router.get('/', (req, res) => {
  try {
    const { house_id, tenant_id, type, status } = req.query;

    let query = `
      SELECT b.*, h.name as house_name, t.name as tenant_name
      FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      LEFT JOIN tenants t ON b.tenant_id = t.id
      WHERE h.user_id = ?
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND b.house_id = ?';
      params.push(house_id);
    }

    if (tenant_id) {
      query += ' AND b.tenant_id = ?';
      params.push(tenant_id);
    }

    if (type) {
      query += ' AND b.type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.bill_date DESC';

    const bills = db.prepare(query).all(...params);

    res.json({ bills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取账单列表失败' });
  }
});

// 获取单个账单详情
router.get('/:id', (req, res) => {
  try {
    const bill = db.prepare(`
      SELECT b.*, h.name as house_name, h.address as house_address,
        t.name as tenant_name, t.phone as tenant_phone
      FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      LEFT JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!bill) {
      return res.status(404).json({ error: '账单不存在' });
    }

    res.json({ bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取账单详情失败' });
  }
});

// 新增账单
router.post('/', (req, res) => {
  try {
    const { house_id, tenant_id, type, amount, bill_date, remark } = req.body;

    if (!house_id || !type || !amount || !bill_date) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋属于当前用户
    const house = db.prepare('SELECT id FROM houses WHERE id = ? AND user_id = ?')
      .get(house_id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    const billId = uuidv4();

    db.prepare(`
      INSERT INTO bills (id, house_id, tenant_id, type, amount, bill_date, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(billId, house_id, tenant_id || null, type, amount, bill_date, remark || '');

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);

    res.json({ message: '添加成功', bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加账单失败' });
  }
});

// 更新账单
router.put('/:id', (req, res) => {
  try {
    const { type, amount, bill_date, status, paid_date, remark } = req.body;

    // 检查账单是否存在且房屋属于当前用户
    const bill = db.prepare(`
      SELECT b.* FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      WHERE b.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!bill) {
      return res.status(404).json({ error: '账单不存在' });
    }

    db.prepare(`
      UPDATE bills
      SET type = ?, amount = ?, bill_date = ?, status = ?, paid_date = ?, remark = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      type || bill.type,
      amount || bill.amount,
      bill_date || bill.bill_date,
      status || bill.status,
      status === '已缴纳' ? (paid_date || new Date().toISOString().split('T')[0]) : bill.paid_date,
      remark !== undefined ? remark : bill.remark,
      req.params.id
    );

    const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);

    res.json({ message: '更新成功', bill: updatedBill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新账单失败' });
  }
});

// 标记账单为已缴纳
router.post('/:id/pay', (req, res) => {
  try {
    const paid_date = req.body.paid_date || new Date().toISOString().split('T')[0];

    // 检查账单是否存在且房屋属于当前用户
    const bill = db.prepare(`
      SELECT b.* FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      WHERE b.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!bill) {
      return res.status(404).json({ error: '账单不存在' });
    }

    db.prepare(`
      UPDATE bills SET status = ?, paid_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run('已缴纳', paid_date, req.params.id);

    res.json({ message: '缴费成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '缴费失败' });
  }
});

// 删除账单
router.delete('/:id', (req, res) => {
  try {
    // 检查账单是否存在且房屋属于当前用户
    const bill = db.prepare(`
      SELECT b.* FROM bills b
      LEFT JOIN houses h ON b.house_id = h.id
      WHERE b.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!bill) {
      return res.status(404).json({ error: '账单不存在' });
    }

    db.prepare('DELETE FROM bills WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除账单失败' });
  }
});

module.exports = router;