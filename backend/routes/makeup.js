const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');
const { getAttendanceStatus, calculateWorkHours, isWorkDay } = require('../utils/attendance');

router.get('/my-makeups', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;
    const employeeId = req.user.id;

    let query = `
      SELECT ma.*, e.name as employee_name, e.employee_no, d.name as department_name
      FROM makeup_applications ma
      JOIN employees e ON ma.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE ma.employee_id = ?
    `;
    const params = [employeeId];

    if (status) {
      query += ' AND ma.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ma.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM makeup_applications WHERE employee_id = ?';
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
    console.error('获取我的补卡申请错误:', error);
    res.status(500).json({ error: '获取补卡申请失败' });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT ma.*, e.name as employee_name, e.employee_no, d.name as department_name
      FROM makeup_applications ma
      JOIN employees e ON ma.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE ma.status = 'pending'
    `;
    const params = [];

    if (userRole === 'manager') {
      query += ` AND ma.current_level = 1
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      params.push(userId, userId);
    } else if (userRole === 'hr') {
      query += ' AND ma.current_level = 2';
    } else {
      return res.json({ list: [], total: 0, page: 1, pageSize: 10 });
    }

    query += ' ORDER BY ma.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM makeup_applications ma JOIN employees e ON ma.employee_id = e.id WHERE ma.status = ?';
    const countParams = ['pending'];

    if (userRole === 'manager') {
      countQuery += ` AND ma.current_level = 1
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      countParams.push(userId, userId);
    } else if (userRole === 'hr') {
      countQuery += ' AND ma.current_level = 2';
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      list: rows,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取待审批补卡错误:', error);
    res.status(500).json({ error: '获取待审批列表失败' });
  }
});

router.get('/pending-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = 'SELECT COUNT(*) as count FROM makeup_applications ma JOIN employees e ON ma.employee_id = e.id WHERE ma.status = ?';
    const params = ['pending'];

    if (userRole === 'manager') {
      query += ` AND ma.current_level = 1
        AND e.department_id = (SELECT department_id FROM employees WHERE id = ?)
        AND e.id != ?`;
      params.push(userId, userId);
    } else if (userRole === 'hr') {
      query += ' AND ma.current_level = 2';
    } else {
      return res.json({ count: 0 });
    }

    const [result] = await pool.query(query, params);

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('获取待审批补卡数量错误:', error);
    res.status(500).json({ error: '获取待审批数量失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { makeup_date, makeup_type, clock_in_time, clock_out_time, reason } = req.body;
    const employeeId = req.user.id;

    if (!makeup_date || !makeup_type) {
      return res.status(400).json({ error: '补卡日期和类型不能为空' });
    }

    if (req.user.status !== 'active') {
      return res.status(403).json({ error: '您当前不是在职状态，无法申请补卡' });
    }

    if (makeup_type === 'clock_in' && !clock_in_time) {
      return res.status(400).json({ error: '上班卡补卡请填写上班时间' });
    }
    if (makeup_type === 'clock_out' && !clock_out_time) {
      return res.status(400).json({ error: '下班卡补卡请填写下班时间' });
    }
    if (makeup_type === 'all_day' && (!clock_in_time || !clock_out_time)) {
      return res.status(400).json({ error: '全天补卡请同时填写上下班时间' });
    }

    const workDay = await isWorkDay(makeup_date);
    if (!workDay) {
      return res.status(400).json({ error: '非工作日无需补卡' });
    }

    const [leaveRecords] = await pool.query(
      `SELECT id FROM leave_applications
       WHERE employee_id = ? AND status = 'approved'
       AND start_date <= ? AND end_date >= ?`,
      [employeeId, makeup_date, makeup_date]
    );

    if (leaveRecords.length > 0) {
      return res.status(400).json({ error: '该日期处于已批准请假期间，无法申请补卡' });
    }

    const [existingPending] = await pool.query(
      `SELECT id FROM makeup_applications
       WHERE employee_id = ? AND makeup_date = ? AND makeup_type = ? AND status = 'pending'`,
      [employeeId, makeup_date, makeup_type]
    );

    if (existingPending.length > 0) {
      return res.status(400).json({ error: '该日期此类型的补卡申请正在审批中，请耐心等待' });
    }

    let inTime = clock_in_time || null;
    let outTime = clock_out_time || null;
    if (makeup_type === 'all_day') {
      inTime = clock_in_time;
      outTime = clock_out_time;
    } else if (makeup_type === 'clock_in') {
      inTime = clock_in_time;
      outTime = null;
    } else if (makeup_type === 'clock_out') {
      inTime = null;
      outTime = clock_out_time;
    }

    const [result] = await pool.query(
      `INSERT INTO makeup_applications (employee_id, makeup_date, makeup_type, clock_in_time, clock_out_time, reason, status, current_level)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [employeeId, makeup_date, makeup_type, inTime, outTime, reason]
    );

    res.json({ id: result.insertId, message: '补卡申请提交成功' });
  } catch (error) {
    console.error('提交补卡申请错误:', error);
    res.status(500).json({ error: '提交补卡申请失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT ma.*, e.name as employee_name, e.employee_no, e.department_id, d.name as department_name
       FROM makeup_applications ma
       JOIN employees e ON ma.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ma.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '补卡申请不存在' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('获取补卡详情错误:', error);
    res.status(500).json({ error: '获取补卡详情失败' });
  }
});

router.post('/:id/revoke', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    const [apps] = await pool.query(
      'SELECT * FROM makeup_applications WHERE id = ?',
      [id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: '补卡申请不存在' });
    }

    const makeup = apps[0];

    if (makeup.employee_id !== employeeId) {
      return res.status(403).json({ error: '无权撤销他人的补卡申请' });
    }

    if (makeup.status !== 'pending') {
      return res.status(400).json({ error: '只有待审批状态才能撤销' });
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    await pool.query(
      `UPDATE makeup_applications SET status = 'revoked', revoked_at = ? WHERE id = ?`,
      [now, id]
    );

    res.json({ message: '补卡申请已撤销' });
  } catch (error) {
    console.error('撤销补卡申请错误:', error);
    res.status(500).json({ error: '撤销失败' });
  }
});

router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [apps] = await pool.query(
      'SELECT * FROM makeup_applications WHERE id = ?',
      [id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: '补卡申请不存在' });
    }

    const makeup = apps[0];

    if (makeup.status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理，无法重复审批' });
    }

    if (userRole === 'manager' && makeup.current_level !== 1) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }

    if (userRole === 'manager') {
      const [employee] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [makeup.employee_id]
      );

      const [manager] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [userId]
      );

      if (employee[0].department_id !== manager[0].department_id) {
        return res.status(403).json({ error: '您不是该员工的部门负责人' });
      }

      if (makeup.employee_id === userId) {
        return res.status(403).json({ error: '不能审批自己的补卡申请' });
      }
    }

    if (userRole === 'hr' && makeup.current_level !== 2) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

      if (makeup.current_level === 1 && userRole === 'manager') {
        await connection.query(
          'UPDATE makeup_applications SET current_level = 2, manager_approved_at = ? WHERE id = ?',
          [now, id]
        );
        await connection.commit();
        res.json({ message: '部门审批通过，已提交HR备案' });
      } else if (makeup.current_level === 2 && userRole === 'hr') {
        await connection.query(
          'UPDATE makeup_applications SET status = ?, hr_approved_at = ? WHERE id = ?',
          ['approved', now, id]
        );

        const makeupDate = makeup.makeup_date;
        const empId = makeup.employee_id;
        const newInTime = makeup.clock_in_time;
        const newOutTime = makeup.clock_out_time;

        const [existing] = await connection.query(
          'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
          [empId, makeupDate]
        );

        if (existing.length > 0) {
          const record = existing[0];
          const finalInTime = newInTime || record.clock_in_time;
          const finalOutTime = newOutTime || record.clock_out_time;
          const newStatus = getAttendanceStatus(finalInTime, finalOutTime);
          const newWorkHours = calculateWorkHours(finalInTime, finalOutTime);

          await connection.query(
            `UPDATE attendance_records
             SET clock_in_time = ?, clock_out_time = ?, status = ?, work_hours = ?
             WHERE id = ?`,
            [finalInTime, finalOutTime, newStatus, newWorkHours, record.id]
          );
        } else {
          const finalInTime = newInTime;
          const finalOutTime = newOutTime;
          const newStatus = getAttendanceStatus(finalInTime, finalOutTime);
          const newWorkHours = calculateWorkHours(finalInTime, finalOutTime);

          await connection.query(
            `INSERT INTO attendance_records (employee_id, record_date, clock_in_time, clock_out_time, status, work_hours)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [empId, makeupDate, finalInTime, finalOutTime, newStatus, newWorkHours]
          );
        }

        await connection.commit();
        res.json({ message: 'HR审批通过，考勤记录已更新' });
      }
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('审批补卡申请错误:', error);
    res.status(500).json({ error: '审批失败' });
  }
});

router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [apps] = await pool.query(
      'SELECT * FROM makeup_applications WHERE id = ?',
      [id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ error: '补卡申请不存在' });
    }

    const makeup = apps[0];

    if (makeup.status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理，无法重复审批' });
    }

    if (userRole === 'manager' && makeup.current_level !== 1) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }

    if (userRole === 'manager') {
      const [employee] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [makeup.employee_id]
      );

      const [manager] = await pool.query(
        'SELECT department_id FROM employees WHERE id = ?',
        [userId]
      );

      if (employee[0].department_id !== manager[0].department_id) {
        return res.status(403).json({ error: '您不是该员工的部门负责人' });
      }

      if (makeup.employee_id === userId) {
        return res.status(403).json({ error: '不能审批自己的补卡申请' });
      }
    }

    if (userRole === 'hr' && makeup.current_level !== 2) {
      return res.status(403).json({ error: '当前审批级别不对' });
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const rejectedBy = userRole === 'manager' ? '部门主管' : 'HR';

    await pool.query(
      `UPDATE makeup_applications
       SET status = ?, reject_reason = ?, rejected_by = ?, rejected_at = ?
       WHERE id = ?`,
      ['rejected', reject_reason || '无', rejectedBy, now, id]
    );

    res.json({ message: '已驳回补卡申请' });
  } catch (error) {
    console.error('驳回补卡申请错误:', error);
    res.status(500).json({ error: '驳回失败' });
  }
});

module.exports = router;
