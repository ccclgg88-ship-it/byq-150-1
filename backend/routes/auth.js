const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { employee_no, password } = req.body;
    
    if (!employee_no || !password) {
      return res.status(400).json({ error: '工号和密码不能为空' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE employee_no = ?',
      [employee_no]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: '工号或密码错误' });
    }

    const user = rows[0];
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用，请联系HR' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: '工号或密码错误' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        employee_no: user.employee_no,
        name: user.name,
        department_id: user.department_id,
        position: user.position,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

module.exports = router;
