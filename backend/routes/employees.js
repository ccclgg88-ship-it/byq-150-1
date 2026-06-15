const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');
const { calculateAnnualLeaveBalance } = require('../utils/attendance');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '', department_id, status } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userDeptId = req.user.department_id;
    
    let query = `
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (userRole === 'manager') {
      query += ' AND e.department_id = ?';
      params.push(userDeptId);
    } else if (userRole === 'employee') {
      query += ' AND e.id = ?';
      params.push(userId);
    }
    
    if (keyword) {
      query += ' AND (e.name LIKE ? OR e.employee_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    if (department_id) {
      if (userRole === 'hr') {
        query += ' AND e.department_id = ?';
        params.push(department_id);
      }
    }
    
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY e.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM employees e WHERE 1=1';
    const countParams = [];
    
    if (userRole === 'manager') {
      countQuery += ' AND e.department_id = ?';
      countParams.push(userDeptId);
    } else if (userRole === 'employee') {
      countQuery += ' AND e.id = ?';
      countParams.push(userId);
    }
    
    if (keyword) {
      countQuery += ' AND (e.name LIKE ? OR e.employee_no LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    if (department_id && userRole === 'hr') {
      countQuery += ' AND e.department_id = ?';
      countParams.push(department_id);
    }
    
    if (status) {
      countQuery += ' AND e.status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.json({
      list: rows,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取员工列表错误:', error);
    res.status(500).json({ error: '获取员工列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userDeptId = req.user.department_id;
    
    const [rows] = await pool.query(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '员工不存在' });
    }
    
    if (userRole === 'employee' && parseInt(id) !== userId) {
      return res.status(403).json({ error: '无权查看其他员工信息' });
    }
    
    if (userRole === 'manager' && rows[0].department_id !== userDeptId) {
      return res.status(403).json({ error: '无权查看其他部门员工信息' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('获取员工详情错误:', error);
    res.status(500).json({ error: '获取员工详情失败' });
  }
});

router.get('/:id/attendance-summary', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    
    const startDate = dayjs(targetMonth + '-01').format('YYYY-MM-DD');
    const endDate = dayjs(targetMonth + '-01').endOf('month').format('YYYY-MM-DD');
    
    const [records] = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM attendance_records 
       WHERE employee_id = ? AND record_date BETWEEN ? AND ?
       GROUP BY status`,
      [id, startDate, endDate]
    );
    
    let workDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    let earlyLeaveDays = 0;
    let absentDays = 0;
    
    records.forEach(r => {
      if (r.status === 'normal') workDays += r.count;
      if (r.status === 'late') { workDays += r.count; lateDays += r.count; }
      if (r.status === 'early_leave') { workDays += r.count; earlyLeaveDays += r.count; }
      if (r.status === 'leave') leaveDays += r.count;
      if (r.status === 'absent') absentDays += r.count;
    });
    
    const [employee] = await pool.query(
      'SELECT hire_date, annual_leave_balance FROM employees WHERE id = ?',
      [id]
    );
    
    const annualBalance = employee[0]?.annual_leave_balance || calculateAnnualLeaveBalance(employee[0]?.hire_date);
    
    res.json({
      month: targetMonth,
      work_days: workDays,
      late_days: lateDays,
      early_leave_days: earlyLeaveDays,
      leave_days: leaveDays,
      absent_days: absentDays,
      annual_leave_balance: annualBalance
    });
  } catch (error) {
    console.error('获取考勤摘要错误:', error);
    res.status(500).json({ error: '获取考勤摘要失败' });
  }
});

router.post('/', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { employee_no, name, department_id, position, hire_date, status = 'active', role = 'employee', password = '123456' } = req.body;
    
    if (!employee_no || !name) {
      return res.status(400).json({ error: '工号和姓名不能为空' });
    }
    
    const annual_leave_balance = calculateAnnualLeaveBalance(hire_date);
    
    const [result] = await pool.query(
      `INSERT INTO employees (employee_no, name, department_id, position, hire_date, status, role, password, annual_leave_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_no, name, department_id, position, hire_date, status, role, password, annual_leave_balance]
    );
    
    res.json({ id: result.insertId, message: '员工创建成功' });
  } catch (error) {
    console.error('创建员工错误:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '工号已存在' });
    }
    res.status(500).json({ error: '创建员工失败' });
  }
});

router.put('/:id', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, position, hire_date, status, role } = req.body;
    
    const [oldEmployee] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (oldEmployee.length === 0) {
      return res.status(404).json({ error: '员工不存在' });
    }
    
    let annual_leave_balance = oldEmployee[0].annual_leave_balance;
    if (hire_date && hire_date !== oldEmployee[0].hire_date) {
      annual_leave_balance = calculateAnnualLeaveBalance(hire_date);
    }
    
    await pool.query(
      `UPDATE employees 
       SET name = ?, department_id = ?, position = ?, hire_date = ?, status = ?, role = ?, annual_leave_balance = ?
       WHERE id = ?`,
      [name || oldEmployee[0].name, 
       department_id !== undefined ? department_id : oldEmployee[0].department_id, 
       position || oldEmployee[0].position, 
       hire_date || oldEmployee[0].hire_date, 
       status || oldEmployee[0].status, 
       role || oldEmployee[0].role,
       annual_leave_balance,
       id]
    );
    
    res.json({ message: '员工信息更新成功' });
  } catch (error) {
    console.error('更新员工错误:', error);
    res.status(500).json({ error: '更新员工失败' });
  }
});

router.delete('/:id', authMiddleware, requireRole('hr'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ message: '员工删除成功' });
  } catch (error) {
    console.error('删除员工错误:', error);
    res.status(500).json({ error: '删除员工失败' });
  }
});

module.exports = router;
