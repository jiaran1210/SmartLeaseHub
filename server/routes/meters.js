const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取水电煤读数列表
router.get('/', async (req, res) => {
  try {
    const { house_id, type } = req.query;

    let query = `
      SELECT m.*, h.name as house_name
      FROM meter_readings m
      LEFT JOIN houses h ON m.house_id = h.id
      WHERE h.user_id = $1
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND m.house_id = $' + (params.length + 1);
      params.push(house_id);
    }

    if (type) {
      query += ' AND m.type = $' + (params.length + 1);
      params.push(type);
    }

    query += ' ORDER BY m.reading_date DESC, m.type ASC';

    const readings = await db.prepare(query).all(...params);

    res.json({ readings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取读数列表失败' });
  }
});

// 获取某房屋某类型最新读数
router.get('/latest/:house_id/:type', async (req, res) => {
  try {
    const { house_id, type } = req.params;

    // 验证房屋属于当前用户
    const house = await db.prepare('SELECT id FROM houses WHERE id = $1 AND user_id = $2')
      .get(house_id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    const reading = await db.prepare(`
      SELECT * FROM meter_readings
      WHERE house_id = $1 AND type = $2
      ORDER BY reading_date DESC, created_at DESC
      LIMIT 1
    `).get(house_id, type);

    res.json({ reading: reading || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取最新读数失败' });
  }
});

// 新增读数
router.post('/', async (req, res) => {
  try {
    const { house_id, type, reading, reading_date, cost } = req.body;

    if (!house_id || !type || !reading || !reading_date) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋属于当前用户
    const house = await db.prepare('SELECT id FROM houses WHERE id = $1 AND user_id = $2')
      .get(house_id, req.userId);

    if (!house) {
      return res.status(404).json({ error: '房屋不存在' });
    }

    // 计算用量
    let usage = 0;
    const lastReading = await db.prepare(`
      SELECT reading FROM meter_readings
      WHERE house_id = $1 AND type = $2
      ORDER BY reading_date DESC, created_at DESC
      LIMIT 1
    `).get(house_id, type);

    if (lastReading) {
      usage = reading - lastReading.reading;
    }

    const readingId = uuidv4();

    await db.prepare(`
      INSERT INTO meter_readings (id, house_id, type, reading, reading_date, usage_amount, cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `).run(readingId, house_id, type, reading, reading_date, usage > 0 ? usage : 0, cost || null);

    const newReading = await db.prepare('SELECT * FROM meter_readings WHERE id = $1').get(readingId);

    res.json({ message: '添加成功', reading: newReading });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加读数失败' });
  }
});

// 删除读数
router.delete('/:id', async (req, res) => {
  try {
    // 检查读数是否存在且房屋属于当前用户
    const reading = await db.prepare(`
      SELECT m.* FROM meter_readings m
      LEFT JOIN houses h ON m.house_id = h.id
      WHERE m.id = $1 AND h.user_id = $2
    `).get(req.params.id, req.userId);

    if (!reading) {
      return res.status(404).json({ error: '读数记录不存在' });
    }

    await db.prepare('DELETE FROM meter_readings WHERE id = $1').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除读数失败' });
  }
});

module.exports = router;