const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const dayjs = require('dayjs');
const ExcelJS = require('exceljs');

router.get('/department-attendance-rate', authMiddleware, requireRole('hr', 'manager'), async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const startDate = dayjs(targetMonth + '-01').format('YYYY-MM-DD');
    const endDate = dayjs(targetMonth + '-01').endOf('month').format('YYYY-MM-DD');
    
    const [records] = await pool.query(`
      SELECT d.id, d.name as department_name,
             COUNT(DISTINCT e.id) as employee_count,
             SUM(CASE WHEN a.status = 'normal' OR a.status = 'late' OR a.status = 'early_leave' THEN 1 ELSE 0 END) as attendance_days,
             SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
             SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
      LEFT JOIN attendance_records a ON e.id = a.employee_id 
        AND a.record_date BETWEEN ? AND ?
      GROUP BY d.id, d.name
      ORDER BY attendance_days DESC
    `, [startDate, endDate]);
    
    const result = records.map(r => {
      const totalDays = r.attendance_days + r.absent_days;
      const rate = totalDays > 0 ? ((r.attendance_days / totalDays) * 100).toFixed(2) : 0;
      return {
        ...r,
        attendance_rate: parseFloat(rate)
      };
    });
    
    res.json({
      month: targetMonth,
      list: result
    });
  } catch (error) {
    console.error('获取部门考勤率排名错误:', error);
    res.status(500).json({ error: '获取报表数据失败' });
  }
});

router.get('/leave-type-statistics', authMiddleware, requireRole('hr', 'manager'), async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || dayjs().format('YYYY-MM');
    const startDate = dayjs(targetMonth + '-01').format('YYYY-MM-DD');
    const endDate = dayjs(targetMonth + '-01').endOf('month').format('YYYY-MM-DD');
    
    const [records] = await pool.query(`
      SELECT leave_type, COUNT(*) as count, SUM(days) as total_days
      FROM leave_applications
      WHERE status = 'approved'
        AND start_date <= ?
        AND end_date >= ?
      GROUP BY leave_type
    `, [endDate, startDate]);
    
    const typeMap = {
      'annual': '年假',
      'personal': '事假',
      'sick': '病假'
    };
    
    const result = records.map(r => ({
      type: r.leave_type,
      type_name: typeMap[r.leave_type] || r.leave_type,
      count: r.count,
      total_days: r.total_days
    }));
    
    res.json({
      month: targetMonth,
      list: result
    });
  } catch (error) {
    console.error('获取请假类型统计错误:', error);
    res.status(500).json({ error: '获取报表数据失败' });
  }
});

router.get('/export/department-attendance', authMiddleware, requireRole('hr', 'manager'), async (req, res) => {
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
    
    const [records] = await pool.query(`
      SELECT e.employee_no, e.name, d.name as department_name, e.position,
             a.record_date, a.clock_in_time, a.clock_out_time, a.status, a.work_hours
      FROM employees e
      LEFT JOIN attendance_records a ON e.id = a.employee_id 
        AND a.record_date BETWEEN ? AND ?
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'active' ${deptCondition}
      ORDER BY e.employee_no, a.record_date
    `, params);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('考勤明细');
    
    worksheet.columns = [
      { header: '工号', key: 'employee_no', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '部门', key: 'department_name', width: 15 },
      { header: '岗位', key: 'position', width: 15 },
      { header: '日期', key: 'record_date', width: 12 },
      { header: '上班时间', key: 'clock_in_time', width: 12 },
      { header: '下班时间', key: 'clock_out_time', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '工时(h)', key: 'work_hours', width: 10 }
    ];
    
    const statusMap = {
      'normal': '正常',
      'late': '迟到',
      'early_leave': '早退',
      'absent': '缺勤',
      'leave': '请假',
      'weekend': '周末',
      'holiday': '节假日'
    };
    
    records.forEach(r => {
      worksheet.addRow({
        employee_no: r.employee_no,
        name: r.name,
        department_name: r.department_name || '-',
        position: r.position || '-',
        record_date: r.record_date ? dayjs(r.record_date).format('YYYY-MM-DD') : '-',
        clock_in_time: r.clock_in_time || '-',
        clock_out_time: r.clock_out_time || '-',
        status: statusMap[r.status] || r.status || '-',
        work_hours: r.work_hours || 0
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${targetMonth}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出考勤明细错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

module.exports = router;
