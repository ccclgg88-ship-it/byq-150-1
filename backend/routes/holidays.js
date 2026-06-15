const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const dayjs = require('dayjs');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || dayjs().year();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;
    
    const [rows] = await pool.query(
      'SELECT * FROM holidays WHERE holiday_date BETWEEN ? AND ? ORDER BY holiday_date',
      [startDate, endDate]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('获取节假日列表错误:', error);
    res.status(500).json({ error: '获取节假日列表失败' });
  }
});

module.exports = router;
