const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取房屋列表
router.get('/', async (req, res) => {
  try {
    const houses = await db.prepare(`
      SELECT h.*,
        (SELECT COUNT(*) FROM tenants WHERE house_id = h.id AND status = 'active') as tenant_count,
        (SELECT COALESCE(SUM(rp.amount), 0) FROM rent_payments rp WHERE rp.house_id = h.id) as total_income
      FROM houses h
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC
    `).all(req.userId);

    res.json({ houses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取房屋列表失败' });
  }
});

// 获取单个房屋详情
router.get('/:id', async (req, res) => {
  try {
    const house = await db.prepare(`
      SELECT h.*,
        (SELECT COUNT(*) FROM tenants WHERE house_id = h.id AND status = 'active') as tenant_count,
        (SELECT COALESCE(SUM(rp.amount), 0) FROM rent_payments rp WHERE rp.house_id = h.id) as total_income
      FROM houses h
      WHERE h.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    res.json({ house });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取房屋详情失败' });
  }
});

// 新增房屋
router.post('/', async (req, res) => {
  try {
    const { name, address, rooms, area } = req.body;

    if (!name) {
      return res.status(400).json({ error: '房屋名称不能为空' });
    }

    const houseId = uuidv4();

    await db.prepare(`
      INSERT INTO houses (id, user_id, name, address, rooms, area)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(houseId, req.userId, name, address || '', rooms || '', area || null);

    const house = await db.prepare('SELECT * FROM houses WHERE id = ?').get(houseId);

    res.json({ message: '添加成功', house });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加房屋失败' });
  }
});

// 更新房屋
router.put('/:id', async (req, res) => {
  try {
    const { name, address, rooms, area, status } = req.body;

    // 检查房屋是否存在且属于当前用户
    const house = await db.prepare('SELECT * FROM houses WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    await db.prepare(`
      UPDATE houses
      SET name = ?, address = ?, rooms = ?, area = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || house.name,
      address !== undefined ? address : house.address,
      rooms !== undefined ? rooms : house.rooms,
      area !== undefined ? area : house.area,
      status || house.status,
      req.params.id
    );

    const updatedHouse = await db.prepare('SELECT * FROM houses WHERE id = ?').get(req.params.id);

    res.json({ message: '更新成功', house: updatedHouse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新房屋失败' });
  }
});

// 删除房屋
router.delete('/:id', async (req, res) => {
  try {
    // 检查房屋是否存在且属于当前用户
    const house = await db.prepare('SELECT * FROM houses WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    // 检查是否有活跃租户
    const activeTenants = await db.prepare('SELECT COUNT(*) as count FROM tenants WHERE house_id = ? AND status = ?')
      .get(req.params.id, 'active');

    if (activeTenants.count > 0) {
      return res.status(400).json({ error: '该房屋下还有活跃租户，无法删除' });
    }

    await db.prepare('DELETE FROM houses WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除房屋失败' });
  }
});

module.exports = router;