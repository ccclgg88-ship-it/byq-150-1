const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hr_system_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      employee_no: user.employee_no,
      name: user.name,
      role: user.role,
      department_id: user.department_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, employee_no, name, department_id, position, status, role FROM employees WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }

    if (rows[0].status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, requireRole };
