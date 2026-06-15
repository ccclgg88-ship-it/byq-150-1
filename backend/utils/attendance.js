const dayjs = require('dayjs');
const { pool } = require('../config/database');

async function isWeekend(date) {
  const day = dayjs(date).day();
  return day === 0 || day === 6;
}

async function isHoliday(date) {
  const [rows] = await pool.query(
    'SELECT id FROM holidays WHERE holiday_date = ?',
    [dayjs(date).format('YYYY-MM-DD')]
  );
  return rows.length > 0;
}

async function isWorkDay(date) {
  const weekend = await isWeekend(date);
  const holiday = await isHoliday(date);
  return !weekend && !holiday;
}

function calculateWorkDays(startDate, endDate) {
  let count = 0;
  let current = dayjs(startDate);
  const end = dayjs(endDate);
  
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const day = current.day();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current = current.add(1, 'day');
  }
  
  return count;
}

function calculateAnnualLeaveBalance(hireDate) {
  if (!hireDate) return 0;
  
  const hire = dayjs(hireDate);
  const now = dayjs();
  const years = now.diff(hire, 'year');
  
  if (years >= 10) return 15;
  if (years >= 5) return 10;
  if (years >= 1) return 5;
  return 0;
}

function getAttendanceStatus(clockIn, clockOut) {
  let status = 'normal';
  
  if (clockIn) {
    const inTime = dayjs(clockIn, 'HH:mm:ss');
    const lateThreshold = dayjs('09:00:00', 'HH:mm:ss');
    if (inTime.isAfter(lateThreshold)) {
      status = 'late';
    }
  }
  
  if (clockOut) {
    const outTime = dayjs(clockOut, 'HH:mm:ss');
    const earlyThreshold = dayjs('18:00:00', 'HH:mm:ss');
    if (outTime.isBefore(earlyThreshold)) {
      status = status === 'late' ? 'late' : 'early_leave';
    }
  }
  
  return status;
}

function calculateWorkHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  
  const inTime = dayjs(clockIn, 'HH:mm:ss');
  const outTime = dayjs(clockOut, 'HH:mm:ss');
  const diff = outTime.diff(inTime, 'minute');
  
  return Math.max(0, diff / 60);
}

module.exports = {
  isWeekend,
  isHoliday,
  isWorkDay,
  calculateWorkDays,
  calculateAnnualLeaveBalance,
  getAttendanceStatus,
  calculateWorkHours
};
