const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');
const { isWorkDay, isHoliday, getAttendanceStatus, calculateWorkHours } = require('../utils/attendance');

router.get('/my-attendance', authMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const employeeId = req.user.id;
    
    const startDate = dayjs(targetMonth + '-01').format('YYYY-MM-DD');
    const endDate = dayjs(targetMonth + '-01').endOf('month').format('YYYY-MM-DD');
    
    const [records] = await pool.query(
      `SELECT * FROM attendance_records 
       WHERE employee_id = ? AND record_date BETWEEN ? AND ?
       ORDER BY record_date`,
      [employeeId, startDate, endDate]
    );
    
    const [holidays] = await pool.query(
      'SELECT holiday_date, name FROM holidays WHERE holiday_date BETWEEN ? AND ?',
      [startDate, endDate]
    );
    
    const holidayMap = {};
    holidays.forEach(h => {
      holidayMap[dayjs(h.holiday_date).format('YYYY-MM-DD')] = h.name;
    });
    
    const calendarData = [];
    const daysInMonth = dayjs(targetMonth + '-01').daysInMonth();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = dayjs(targetMonth + '-' + String(i).padStart(2, '0')).format('YYYY-MM-DD');
      const record = records.find(r => dayjs(r.record_date).format('YYYY-MM-DD') === dateStr);
      const dayOfWeek = dayjs(dateStr).day();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHol = !!holidayMap[dateStr];
      
      let status = 'workday';
      let displayStatus = '';
      
      if (isHol) {
        status = 'holiday';
        displayStatus = holidayMap[dateStr];
      } else if (isWeekend) {
        status = 'weekend';
        displayStatus = '周末';
      } else if (record) {
        status = record.status;
        const statusMap = {
          'normal': '正常',
          'late': '迟到',
          'early_leave': '早退',
          'absent': '缺勤',
          'leave': '请假'
        };
        displayStatus = statusMap[record.status] || record.status;
      } else {
        status = 'not_recorded';
        displayStatus = '未打卡';
      }
      
      calendarData.push({
        date: dateStr,
        day: i,
        dayOfWeek,
        status,
        displayStatus,
        isWeekend,
        isHoliday: isHol,
        clock_in_time: record?.clock_in_time,
        clock_out_time: record?.clock_out_time,
        work_hours: record?.work_hours
      });
    }
    
    const workDayRecords = records.filter(r => r.status !== 'weekend' && r.status !== 'holiday');
    const normalDays = workDayRecords.filter(r => r.status === 'normal').length;
    const lateDays = workDayRecords.filter(r => r.status === 'late').length;
    const earlyLeaveDays = workDayRecords.filter(r => r.status === 'early_leave').length;
    const leaveDays = workDayRecords.filter(r => r.status === 'leave').length;
    const absentDays = workDayRecords.filter(r => r.status === 'absent').length;
    
    res.json({
      month: targetMonth,
      calendar: calendarData,
      summary: {
        total_work_days: workDayRecords.length,
        normal_days: normalDays,
        late_days: lateDays,
        early_leave_days: earlyLeaveDays,
        leave_days: leaveDays,
        absent_days: absentDays
      }
    });
  } catch (error) {
    console.error('获取我的考勤错误:', error);
    res.status(500).json({ error: '获取考勤数据失败' });
  }
});

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const employeeId = req.user.id;
    
    const [leaveRecords] = await pool.query(
      `SELECT * FROM leave_applications 
       WHERE employee_id = ? AND status = 'approved' 
       AND start_date <= ? AND end_date >= ?`,
      [employeeId, today, today]
    );
    
    const isOnLeave = leaveRecords.length > 0;
    
    const [records] = await pool.query(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
      [employeeId, today]
    );
    
    const canClockIn = !isOnLeave && req.user.status === 'active';
    const canClockOut = !isOnLeave && req.user.status === 'active';
    
    res.json({
      today,
      record: records[0] || null,
      is_on_leave: isOnLeave,
      can_clock_in: canClockIn,
      can_clock_out: canClockOut,
      employee_status: req.user.status
    });
  } catch (error) {
    console.error('获取今日考勤错误:', error);
    res.status(500).json({ error: '获取今日考勤失败' });
  }
});

router.post('/clock-in', authMiddleware, async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const now = dayjs().format('HH:mm:ss');
    const employeeId = req.user.id;
    
    if (req.user.status !== 'active') {
      return res.status(403).json({ error: '您当前不是在职状态，无法打卡' });
    }
    
    const [leaveRecords] = await pool.query(
      `SELECT * FROM leave_applications 
       WHERE employee_id = ? AND status = 'approved' 
       AND start_date <= ? AND end_date >= ?`,
      [employeeId, today, today]
    );
    
    if (leaveRecords.length > 0) {
      return res.status(400).json({ error: '您当前处于请假状态，无法打卡' });
    }
    
    const workDay = await isWorkDay(today);
    if (!workDay) {
      return res.status(400).json({ error: '今天是非工作日，无需打卡' });
    }
    
    const [existing] = await pool.query(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
      [employeeId, today]
    );
    
    if (existing.length > 0 && existing[0].clock_in_time) {
      return res.status(400).json({ error: '今天已经打过上班卡了' });
    }
    
    const status = getAttendanceStatus(now, null);
    
    if (existing.length > 0) {
      await pool.query(
        'UPDATE attendance_records SET clock_in_time = ?, status = ? WHERE id = ?',
        [now, status, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO attendance_records (employee_id, record_date, clock_in_time, status, work_hours)
         VALUES (?, ?, ?, ?, 0)`,
        [employeeId, today, now, status]
      );
    }
    
    const [updated] = await pool.query(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
      [employeeId, today]
    );
    
    res.json({
      message: status === 'late' ? '打卡成功，您迟到了' : '上班打卡成功',
      record: updated[0],
      is_late: status === 'late'
    });
  } catch (error) {
    console.error('上班打卡错误:', error);
    res.status(500).json({ error: '打卡失败' });
  }
});

router.post('/clock-out', authMiddleware, async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const now = dayjs().format('HH:mm:ss');
    const employeeId = req.user.id;
    
    if (req.user.status !== 'active') {
      return res.status(403).json({ error: '您当前不是在职状态，无法打卡' });
    }
    
    const [leaveRecords] = await pool.query(
      `SELECT * FROM leave_applications 
       WHERE employee_id = ? AND status = 'approved' 
       AND start_date <= ? AND end_date >= ?`,
      [employeeId, today, today]
    );
    
    if (leaveRecords.length > 0) {
      return res.status(400).json({ error: '您当前处于请假状态，无法打卡' });
    }
    
    const [existing] = await pool.query(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
      [employeeId, today]
    );
    
    if (existing.length === 0 || !existing[0].clock_in_time) {
      return res.status(400).json({ error: '请先打上班卡' });
    }
    
    if (existing[0].clock_out_time) {
      return res.status(400).json({ error: '今天已经打过下班卡了' });
    }
    
    const clockIn = existing[0].clock_in_time;
    let status = existing[0].status;
    
    const outTime = dayjs(now, 'HH:mm:ss');
    const earlyThreshold = dayjs('18:00:00', 'HH:mm:ss');
    if (outTime.isBefore(earlyThreshold) && status !== 'late') {
      status = 'early_leave';
    } else if (outTime.isBefore(earlyThreshold) && status === 'late') {
      status = 'late';
    }
    
    const workHours = calculateWorkHours(clockIn, now);
    
    await pool.query(
      'UPDATE attendance_records SET clock_out_time = ?, status = ?, work_hours = ? WHERE id = ?',
      [now, status, workHours, existing[0].id]
    );
    
    const [updated] = await pool.query(
      'SELECT * FROM attendance_records WHERE employee_id = ? AND record_date = ?',
      [employeeId, today]
    );
    
    res.json({
      message: status === 'early_leave' ? '下班打卡成功，您早退了' : '下班打卡成功',
      record: updated[0],
      is_early_leave: status === 'early_leave'
    });
  } catch (error) {
    console.error('下班打卡错误:', error);
    res.status(500).json({ error: '打卡失败' });
  }
});

router.get('/department-summary', authMiddleware, requireRole('hr', 'manager'), async (req, res) => {
  try {
    const { month, department_id } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const startDate = dayjs(targetMonth + '-01').format('YYYY-MM-DD');
    const endDate = dayjs(targetMonth + '-01').endOf('month').format('YYYY-MM-DD');
    
    let deptCondition = '';
    const params = [startDate, endDate];
    
    if (req.user.role === 'manager' && !department_id) {
      deptCondition = ' AND e.department_id = ?';
      params.push(req.user.department_id);
    } else if (department_id) {
      deptCondition = ' AND e.department_id = ?';
      params.push(department_id);
    }
    
    const [records] = await pool.query(
      `SELECT e.id, e.employee_no, e.name, d.name as department_name,
              SUM(CASE WHEN a.status = 'normal' THEN 1 ELSE 0 END) as normal_days,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
              SUM(CASE WHEN a.status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_days,
              SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
              SUM(a.work_hours) as total_work_hours
       FROM employees e
       LEFT JOIN attendance_records a ON e.id = a.employee_id 
         AND a.record_date BETWEEN ? AND ?
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.status = 'active' ${deptCondition}
       GROUP BY e.id
       ORDER BY e.employee_no`,
      params
    );
    
    res.json({
      month: targetMonth,
      list: records
    });
  } catch (error) {
    console.error('获取部门考勤汇总错误:', error);
    res.status(500).json({ error: '获取部门考勤汇总失败' });
  }
});

module.exports = router;
