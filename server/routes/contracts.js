const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取合同列表
router.get('/', async (req, res) => {
  try {
    const { house_id, tenant_id } = req.query;

    let query = `
      SELECT c.*, h.name as house_name, t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE h.user_id = ?
    `;
    const params = [req.userId];

    if (house_id) {
      query += ' AND c.house_id = ?';
      params.push(house_id);
    }

    if (tenant_id) {
      query += ' AND c.tenant_id = ?';
      params.push(tenant_id);
    }

    query += ' ORDER BY c.created_at DESC';

    const contracts = await db.prepare(query).all(...params);

    res.json({ contracts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取合同列表失败' });
  }
});

// 获取单个合同详情
router.get('/:id', async (req, res) => {
  try {
    const contract = await db.prepare(`
      SELECT c.*, h.name as house_name, h.address as house_address,
        t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!contract) {
      return res.status(404).json({ error: '合同不存在' });
    }

    res.json({ contract });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取合同详情失败' });
  }
});

// 新增合同
router.post('/', async (req, res) => {
  try {
    const {
      tenant_id, house_id, start_date, end_date, monthly_rent, deposit, contract_file
    } = req.body;

    if (!tenant_id || !house_id || !start_date || !end_date || !monthly_rent) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证房屋和租户属于当前用户
    const house = await db.prepare('SELECT id FROM houses WHERE id = ? AND user_id = ?')
      .get(house_id, req.userId);

    const tenant = await db.prepare('SELECT id FROM tenants WHERE id = ?')
      .get(tenant_id);

    if (!house || !tenant) {
      return res.status(404).json({ error: '房屋或租户不存在' });
    }

    // 生成合同编号
    const contract_no = `HT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const contractId = uuidv4();

    await db.prepare(`
      INSERT INTO contracts (id, tenant_id, house_id, contract_no, start_date, end_date, monthly_rent, deposit, contract_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(contractId, tenant_id, house_id, contract_no, start_date, end_date, monthly_rent, deposit || 0, contract_file || '');

    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);

    res.json({ message: '添加成功', contract });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '添加合同失败' });
  }
});

// 更新合同
router.put('/:id', async (req, res) => {
  try {
    const { start_date, end_date, monthly_rent, deposit, contract_file, status } = req.body;

    // 检查合同是否存在且房屋属于当前用户
    const contract = await db.prepare(`
      SELECT c.* FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      WHERE c.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!contract) {
      return res.status(404).json({ error: '合同不存在' });
    }

    await db.prepare(`
      UPDATE contracts
      SET start_date = ?, end_date = ?, monthly_rent = ?, deposit = ?, contract_file = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      start_date || contract.start_date,
      end_date || contract.end_date,
      monthly_rent || contract.monthly_rent,
      deposit !== undefined ? deposit : contract.deposit,
      contract_file !== undefined ? contract_file : contract.contract_file,
      status || contract.status,
      req.params.id
    );

    const updatedContract = await db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);

    res.json({ message: '更新成功', contract: updatedContract });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新合同失败' });
  }
});

// 删除合同
router.delete('/:id', async (req, res) => {
  try {
    // 检查合同是否存在且房屋属于当前用户
    const contract = await db.prepare(`
      SELECT c.* FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      WHERE c.id = ? AND h.user_id = ?
    `).get(req.params.id, req.userId);

    if (!contract) {
      return res.status(404).json({ error: '合同不存在' });
    }

    await db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除合同失败' });
  }
});

// 获取即将到期的合同
router.get('/expiring/soon', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const contracts = await db.prepare(`
      SELECT c.*, h.name as house_name, h.address as house_address,
        t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      LEFT JOIN houses h ON c.house_id = h.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE h.user_id = ? AND c.status = '生效' AND c.end_date <= ?
      ORDER BY c.end_date ASC
    `).all(req.userId, futureDate.toISOString().split('T')[0]);

    res.json({ contracts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取到期合同失败' });
  }
});

module.exports = router;