const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, 
             e.name as manager_name, 
             e.employee_no as manager_no,
             (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND status = 'active') as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      ORDER BY d.id
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('获取部门列表错误:', error);
    res.status(500).json({ error: '获取部门列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('获取部门详情错误:', error);
    res.status(500).json({ error: '获取部门详情失败' });
  }
});

router.post('/', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { name, manager_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO departments (name, manager_id) VALUES (?, ?)',
      [name, manager_id || null]
    );
    
    res.json({ id: result.insertId, message: '部门创建成功' });
  } catch (error) {
    console.error('创建部门错误:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '部门名称已存在' });
    }
    res.status(500).json({ error: '创建部门失败' });
  }
});

router.put('/:id', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, manager_id } = req.body;
    
    await pool.query(
      'UPDATE departments SET name = ?, manager_id = ? WHERE id = ?',
      [name, manager_id || null, id]
    );
    
    res.json({ message: '部门更新成功' });
  } catch (error) {
    console.error('更新部门错误:', error);
    res.status(500).json({ error: '更新部门失败' });
  }
});

router.delete('/:id', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [employees] = await pool.query(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [id]
    );
    
    if (employees[0].count > 0) {
      return res.status(400).json({ error: '该部门下还有员工，无法删除' });
    }
    
    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    
    res.json({ message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门错误:', error);
    res.status(500).json({ error: '删除部门失败' });
  }
});

module.exports = router;
