const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取租户列表（按房屋筛选）
router.get('/', async (req, res) => {
  try {
    const { house_id } = req.query;

    let query = `
      SELECT t.*, h.name as house_name
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE h.user_id = $1
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND t.house_id = $' + (params.length + 1);
      params.push(house_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const tenants = await db.prepare(query).all(...params);

    res.json({ tenants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取租户列表失败' });
  }
});

// 获取单个租户详情
router.get('/:id', async (req, res) => {
  try {
    const tenant = await db.prepare(`
      SELECT t.*, h.name as house_name, h.address as house_address
      FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = $1 AND h.user_id = $2
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
router.post('/', async (req, res) => {
  try {
    const {
      house_id, name, phone, id_card, emergency_contact, emergency_phone,
      move_in_date, lease_end_date, monthly_rent, deposit
    } = req.body;

    if (!house_id || !name || !phone || !move_in_date || !lease_end_date || !monthly_rent) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋属于当前用户
    const house = await db.prepare('SELECT id FROM houses WHERE id = $1 AND user_id = $2')
      .get(house_id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    const tenantId = uuidv4();

    await db.prepare(`
      INSERT INTO tenants (id, house_id, name, phone, id_card, emergency_contact, emergency_phone,
        move_in_date, lease_end_date, monthly_rent, deposit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `).run(
      tenantId, house_id, name, phone, id_card || '', emergency_contact || '',
      emergency_phone || '', move_in_date, lease_end_date, monthly_rent, deposit || 0
    );

    // 更新房屋状态为出租中
    await db.prepare('UPDATE houses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2')
      .run('出租中', house_id);

    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = $1').get(tenantId);

    res.json({ message: '添加成功', tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加租户失败' });
  }
});

// 更新租户
router.put('/:id', async (req, res) => {
  try {
    const {
      name, phone, id_card, emergency_contact, emergency_phone,
      move_in_date, lease_end_date, monthly_rent, deposit, status
    } = req.body;

    // 检查租户是否存在且房屋属于当前用户
    const tenant = await db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = $1 AND h.user_id = $2
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    await db.prepare(`
      UPDATE tenants
      SET name = $1, phone = $2, id_card = $3, emergency_contact = $4, emergency_phone = $5,
        move_in_date = $6, lease_end_date = $7, monthly_rent = $8, deposit = $9, status = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
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

    const updatedTenant = await db.prepare('SELECT * FROM tenants WHERE id = $1').get(req.params.id);

    res.json({ message: '更新成功', tenant: updatedTenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新租户失败' });
  }
});

// 退租处理
router.post('/:id/move-out', async (req, res) => {
  try {
    const move_out_date = req.body.move_out_date || new Date().toISOString().split('T')[0];

    // 检查租户是否存在且房屋属于当前用户
    const tenant = await db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = $1 AND h.user_id = $2
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    if (tenant.status !== 'active') {
      return res.status(400).json({ error: '该租户已退租' });
    }

    // 更新租户状态
    await db.prepare(`
      UPDATE tenants SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
    `).run('已退租', req.params.id);

    // 检查该房屋是否还有其他活跃租户
    const remainingTenants = await db.prepare(
      'SELECT COUNT(*) as count FROM tenants WHERE house_id = $1 AND status = $2'
    ).get(tenant.house_id, 'active');

    if (remainingTenants.count === 0) {
      await db.prepare('UPDATE houses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2')
        .run('空置中', tenant.house_id);
    }

    res.json({ message: '退租处理成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '退租处理失败' });
  }
});

// 删除租户（仅限已退租的）
router.delete('/:id', async (req, res) => {
  try {
    // 检查租户是否存在且房屋属于当前用户
    const tenant = await db.prepare(`
      SELECT t.* FROM tenants t
      LEFT JOIN houses h ON t.house_id = h.id
      WHERE t.id = $1 AND h.user_id = $2
    `).get(req.params.id, req.userId);

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    if (tenant.status === 'active') {
      return res.status(400).json({ error: '请先办理退租手续' });
    }

    await db.prepare('DELETE FROM tenants WHERE id = $1').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除租户失败' });
  }
});

module.exports = router;