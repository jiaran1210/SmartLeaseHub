const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取租户列表（按房屋筛选）
router.get('/', (req, res) => {
  try {
    const { house_id } = req.query;

    let query = `
      SELECT t.*, h.name as house_name
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE h.user_id = ?
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND t.house_id = ?';
      params.push(house_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const tenants = db.prepare(query).all(...params);

    res.json({ tenants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取租户列表失败' });
  }
});

// 获取单个租户详情
router.get('/:id', (req, res) => {
  try {
    const tenant = db.prepare(`
      SELECT t.*, h.name as house_name, h.address as house_address
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    res.json({ tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取租户详情失败' });
  }
});

// 新增租户
router.post('/', (req, res) => {
  try {
    const {
      house_id, name, phone, id_card, emergency_contact, emergency_phone,
      move_in_date, lease_end_date, monthly_rent, deposit
    } = req.body;

    if (!house_id || !name || !phone || !move_in_date || !lease_end_date || !monthly_rent) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋属于当前用户
    const house = db.prepare('SELECT id FROM houses WHERE id = ? AND user_id = ?')
      .get(house_id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    const tenantId = uuidv4();

    db.prepare(`
      INSERT INTO tenants (id, house_id, name, phone, id_card, emergency_contact, emergency_phone,
        move_in_date, lease_end_date, monthly_rent, deposit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId, house_id, name, phone, id_card || '', emergency_contact || '',
      emergency_phone || '', move_in_date, lease_end_date, monthly_rent, deposit || 0
    );

    // 更新房屋状态为出租中
    db.prepare('UPDATE houses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('出租中', house_id);

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

    res.json({ message: '添加成功', tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加租户失败' });
  }
});

// 更新租户
router.put('/:id', (req, res) => {
  try {
    const {
      name, phone, id_card, emergency_contact, emergency_phone,
      move_in_date, lease_end_date, monthly_rent, deposit, status
    } = req.body;

    // 检查租户是否存在且房屋属于当前用户
    const tenant = db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    db.prepare(`
      UPDATE tenants
      SET name = ?, phone = ?, id_card = ?, emergency_contact = ?, emergency_phone = ?,
        move_in_date = ?, lease_end_date = ?, monthly_rent = ?, deposit = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || tenant.name,
      phone || tenant.phone,
      id_card !== undefined ? id_card : tenant.id_card,
      emergency_contact || tenant.emergency_contact,
      emergency_phone || tenant.emergency_phone,
      move_in_date || tenant.move_in_date,
      lease_end_date || tenant.lease_end_date,
      monthly_rent || tenant.monthly_rent,
      deposit !== undefined ? deposit : tenant.deposit,
      status || tenant.status,
      req.params.id
    );

    const updatedTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);

    res.json({ message: '更新成功', tenant: updatedTenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新租户失败' });
  }
});

// 退租处理
router.post('/:id/move-out', (req, res) => {
  try {
    const move_out_date = req.body.move_out_date || new Date().toISOString().split('T')[0];

    // 检查租户是否存在且房屋属于当前用户
    const tenant = db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    if (tenant.status !== 'active') {
      return res.status(400).json({ error: '该租户已退租' });
    }

    // 更新租户状态
    db.prepare(`
      UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run('已退租', req.params.id);

    // 检查该房屋是否还有其他活跃租户
    const remainingTenants = db.prepare(
      'SELECT COUNT(*) as count FROM tenants WHERE house_id = ? AND status = ?'
    ).get(tenant.house_id, 'active');

    if (remainingTenants.count === 0) {
      db.prepare('UPDATE houses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('空置中', tenant.house_id);
    }

    res.json({ message: '退租处理成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '退租处理失败' });
  }
});

// 删除租户（仅限已退租的）
router.delete('/:id', (req, res) => {
  try {
    // 检查租户是否存在且房屋属于当前用户
    const tenant = db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    if (tenant.status === 'active') {
      return res.status(400).json({ error: '请先办理退租手续' });
    }

    db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除租户失败' });
  }
});

module.exports = router;