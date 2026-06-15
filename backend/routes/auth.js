const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const dayjs = require('dayjs');
const { calculateAnnualLeaveBalance } = require('../utils/attendance');

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
        status: user.status,
        phone: user.phone,
        email: user.email
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

router.put('/profile/contact', authMiddleware, async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    if (email && !/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (phone && !/^[\d-+\s]{6,20}$/.test(phone)) {
      return res.status(400).json({ error: '电话号码格式不正确' });
    }
    
    await pool.query(
      'UPDATE employees SET phone = ?, email = ?, updated_at = ? WHERE id = ?',
      [
        phone !== undefined ? phone : null,
        email !== undefined ? email : null,
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        req.user.id
      ]
    );
    
    res.json({ message: '联系方式修改成功' });
  } catch (error) {
    console.error('修改联系方式错误:', error);
    res.status(500).json({ error: '修改失败' });
  }
});

router.put('/profile/password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({ error: '原密码和新密码不能为空' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ error: '新密码不少于 6 位' });
    }
    if (old_password === new_password) {
      return res.status(400).json({ error: '新密码不能与原密码相同' });
    }
    
    const [rows] = await pool.query('SELECT password FROM employees WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (rows[0].password !== old_password) {
      return res.status(400).json({ error: '原密码不正确' });
    }
    
    await pool.query(
      'UPDATE employees SET password = ?, updated_at = ? WHERE id = ?',
      [new_password, dayjs().format('YYYY-MM-DD HH:mm:ss'), req.user.id]
    );
    
    res.json({ message: '密码修改成功，请重新登录' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

router.get('/profile/summary', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const now = dayjs();
    const thisYear = now.format('YYYY');
    const currentMonth = now.format('YYYY-MM');
    const startOfMonth = currentMonth + '-01';
    const endOfMonth = now.endOf('month').format('YYYY-MM-DD');
    const startOfYear = thisYear + '-01-01';
    const endOfYear = thisYear + '-12-31';
    const sevenDaysAgo = now.subtract(7, 'day').format('YYYY-MM-DD');
    const today = now.format('YYYY-MM-DD');

    const leaveSummaryResult = await pool.query(
      `SELECT 
         leave_type,
         SUM(CASE WHEN status = 'approved' AND leave_type = 'annual' THEN days ELSE 0 END) as annual_used,
         SUM(CASE WHEN status = 'approved' AND leave_type = 'personal' THEN days ELSE 0 END) as personal_total,
         SUM(CASE WHEN status = 'approved' AND leave_type = 'sick' THEN days ELSE 0 END) as sick_total
       FROM leave_applications
       WHERE employee_id = ? AND start_date BETWEEN ? AND ? AND status = 'approved'`,
      [employeeId, startOfYear, endOfYear]
    );
    const leaveSummary = leaveSummaryResult[0]?.[0] || {};

    const leaveRecordsResult = await pool.query(
      `SELECT id, leave_type, start_date, end_date, days, status, reject_reason, created_at
       FROM leave_applications
       WHERE employee_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [employeeId]
    );
    const recentLeaves = leaveRecordsResult[0] || [];

    const attendanceSummaryResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM attendance_records
       WHERE employee_id = ? AND record_date BETWEEN ? AND ?
       GROUP BY status`,
      [employeeId, startOfMonth, endOfMonth]
    );
    const attendanceRows = attendanceSummaryResult[0] || [];
    
    let work_days = 0, late_days = 0, early_leave_days = 0, absent_days = 0, not_recorded = 0;
    attendanceRows.forEach(r => {
      if (r.status === 'normal') work_days += r.count;
      if (r.status === 'late') { work_days += r.count; late_days += r.count; }
      if (r.status === 'early_leave') { work_days += r.count; early_leave_days += r.count; }
      if (r.status === 'absent') absent_days += r.count;
    });

    const recentAttendanceResult = await pool.query(
      `SELECT record_date, clock_in_time, clock_out_time, status, work_hours
       FROM attendance_records
       WHERE employee_id = ? AND record_date BETWEEN ? AND ?
       ORDER BY record_date DESC`,
      [employeeId, sevenDaysAgo, today]
    );
    const recentAttendance = recentAttendanceResult[0] || [];

    const empResult = await pool.query(
      'SELECT hire_date, annual_leave_balance FROM employees WHERE id = ?',
      [employeeId]
    );
    const emp = empResult[0]?.[0];
    const balance = emp?.annual_leave_balance ?? calculateAnnualLeaveBalance(emp?.hire_date);

    res.json({
      leave: {
        annual_balance: balance,
        annual_used: leaveSummary.annual_used || 0,
        personal_total: leaveSummary.personal_total || 0,
        sick_total: leaveSummary.sick_total || 0,
        recent: recentLeaves
      },
      attendance: {
        work_days,
        late_days,
        early_leave_days,
        absent_days,
        not_recorded,
        recent: recentAttendance
      }
    });
  } catch (error) {
    console.error('获取个人中心汇总错误:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

module.exports = router;
