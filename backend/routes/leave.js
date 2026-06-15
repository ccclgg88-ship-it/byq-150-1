const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');
const { calculateWorkDays } = require('../utils/attendance');

router.get('/my-leaves', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;
    const employeeId = req.user.id;
    
    let query = `
      SELECT la.*, e.name as employee_name, d.name as department_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE la.employee_id = ?
    `;
    const params = [employeeId];
    
    if (status) {
      query += ' AND la.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY la.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM leave_applications WHERE employee_id = ?';
    const countParams = [employeeId];
    
    if (status) {
      countQuery += ' AND status = ?';
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
    console.error('获取我的请假错误:', error);
    res.status(500).json({ error: '获取请假记录失败' });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = `
      SELECT la.*, e.name as employee_name, e.employee_no, d.name as department_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE la.status = 'pending'
    `;
    const params = [];
    
    if (userRole === 'manager') {
      query += ` AND la.current_level = 1 
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      params.push(userId, userId);
    } else if (userRole === 'hr') {
      query += ' AND la.current_level = 2';
    } else {
      return res.json({ list: [], total: 0, page: 1, pageSize: 10 });
    }
    
    query += ' ORDER BY la.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM leave_applications la JOIN employees e ON la.employee_id = e.id WHERE la.status = ?';
    const countParams = ['pending'];
    
    if (userRole === 'manager') {
      countQuery += ` AND la.current_level = 1 
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      countParams.push(userId, userId);
    } else if (userRole === 'hr') {
      countQuery += ' AND la.current_level = 2';
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.json({
      list: rows,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取待审批请假错误:', error);
    res.status(500).json({ error: '获取待审批列表失败' });
  }
});

router.get('/pending-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = 'SELECT COUNT(*) as count FROM leave_applications la JOIN employees e ON la.employee_id = e.id WHERE la.status = ?';
    const params = ['pending'];
    
    if (userRole === 'manager') {
      query += ` AND la.current_level = 1 
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      params.push(userId, userId);
    } else if (userRole === 'hr') {
      query += ' AND la.current_level = 2';
    } else {
      return res.json({ count: 0 });
    }
    
    const [result] = await pool.query(query, params);
    
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('获取待审批数量错误:', error);
    res.status(500).json({ error: '获取待审批数量失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    const employeeId = req.user.id;
    
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: '请填写完整的请假信息' });
    }
    
    if (req.user.status !== 'active') {
      return res.status(403).json({ error: '您当前不是在职状态，无法请假' });
    }
    
    const start = dayjs(start_date);
    const end = dayjs(end_date);
    
    if (start.isAfter(end)) {
      return res.status(400).json({ error: '开始日期不能晚于结束日期' });
    }
    
    const days = calculateWorkDays(start_date, end_date);
    
    if (days === 0) {
      return res.status(400).json({ error: '请假日期不能全是周末' });
    }
    
    if (leave_type === 'annual') {
      const [employee] = await pool.query(
        'SELECT annual_leave_balance FROM employees WHERE id = ?',
        [employeeId]
      );
      
      if (employee[0].annual_leave_balance < days) {
        return res.status(400).json({ error: `年假余额不足，剩余${employee[0].annual_leave_balance}天` });
      }
    }
    
    const [result] = await pool.query(
      `INSERT INTO leave_applications (employee_id, leave_type, start_date, end_date, days, reason, status, current_level)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [employeeId, leave_type, start_date, end_date, days, reason]
    );
    
    res.json({ id: result.insertId, message: '请假申请提交成功', days });
  } catch (error) {
    console.error('提交请假申请错误:', error);
    res.status(500).json({ error: '提交请假申请失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT la.*, e.name as employee_name, e.employee_no, e.department_id, d.name as department_name
       FROM leave_applications la
       JOIN employees e ON la.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE la.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '请假申请不存在' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('获取请假详情错误:', error);
    res.status(500).json({ error: '获取请假详情失败' });
  }
});

router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const [leaveApps] = await pool.query(
      'SELECT * FROM leave_applications WHERE id = ?',
      [id]
    );
    
    if (leaveApps.length === 0) {
      return res.status(404).json({ error: '请假申请不存在' });
    }
    
    const leave = leaveApps[0];
    
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理，无法重复审批' });
    }
    
    if (userRole === 'manager' && leave.current_level !== 1) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }
    
    if (userRole === 'manager') {
      const [employee] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [leave.employee_id]
      );
      
      const [manager] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [userId]
      );
      
      if (employee[0].department_id !== manager[0].department_id) {
        return res.status(403).json({ error: '您不是该员工的部门负责人' });
      }
      
      if (leave.employee_id === userId) {
        return res.status(403).json({ error: '不能审批自己的请假申请' });
      }
    }
    
    if (userRole === 'hr' && leave.current_level !== 2) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      if (leave.current_level === 1 && userRole === 'manager') {
        await connection.query(
          'UPDATE leave_applications SET current_level = 2, manager_approved_at = NOW() WHERE id = ?',
          [id]
        );
        await connection.commit();
        res.json({ message: '部门审批通过，已提交HR备案' });
      } else if (leave.current_level === 2 && userRole === 'hr') {
        await connection.query(
          'UPDATE leave_applications SET status = ?, hr_approved_at = NOW() WHERE id = ?',
          ['approved', id]
        );
        
        if (leave.leave_type === 'annual') {
          await connection.query(
            'UPDATE employees SET annual_leave_balance = annual_leave_balance - ? WHERE id = ?',
            [leave.days, leave.employee_id]
          );
        }
        
        const start = dayjs(leave.start_date);
        const end = dayjs(leave.end_date);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, 'day')) {
          const dayOfWeek = current.day();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = current.format('YYYY-MM-DD');
            
            const [existing] = await connection.query(
              'SELECT id FROM attendance_records WHERE employee_id = ? AND record_date = ?',
              [leave.employee_id, dateStr]
            );
            
            if (existing.length > 0) {
              await connection.query(
                'UPDATE attendance_records SET status = ? WHERE id = ?',
                ['leave', existing[0].id]
              );
            } else {
              await connection.query(
                `INSERT INTO attendance_records (employee_id, record_date, status, work_hours)
                 VALUES (?, ?, ?, 0)`,
                [leave.employee_id, dateStr, 'leave']
              );
            }
          }
          current = current.add(1, 'day');
        }
        
        await connection.commit();
        res.json({ message: 'HR审批通过，考勤已更新' });
      }
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('审批请假错误:', error);
    res.status(500).json({ error: '审批失败' });
  }
});

router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const [leaveApps] = await pool.query(
      'SELECT * FROM leave_applications WHERE id = ?',
      [id]
    );
    
    if (leaveApps.length === 0) {
      return res.status(404).json({ error: '请假申请不存在' });
    }
    
    const leave = leaveApps[0];
    
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理，无法重复审批' });
    }
    
    if (userRole === 'manager' && leave.current_level !== 1) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }
    
    if (userRole === 'manager') {
      const [employee] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [leave.employee_id]
      );
      
      const [manager] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [userId]
      );
      
      if (employee[0].department_id !== manager[0].department_id) {
        return res.status(403).json({ error: '您不是该员工的部门负责人' });
      }
      
      if (leave.employee_id === userId) {
        return res.status(403).json({ error: '不能审批自己的请假申请' });
      }
    }
    
    if (userRole === 'hr' && leave.current_level !== 2) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }
    
    await pool.query(
      'UPDATE leave_applications SET status = ? WHERE id = ?',
      ['rejected', id]
    );
    
    res.json({ message: '已驳回请假申请' });
  } catch (error) {
    console.error('驳回请假错误:', error);
    res.status(500).json({ error: '驳回失败' });
  }
});

module.exports = router;
