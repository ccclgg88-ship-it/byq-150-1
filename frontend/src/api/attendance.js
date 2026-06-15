import request from '@/utils/request'

export function getMyAttendance(month) {
  return request({
    url: '/attendance/my-attendance',
    method: 'get',
    params: { month }
  })
}

export function getTodayAttendance() {
  return request({
    url: '/attendance/today',
    method: 'get'
  })
}

export function clockIn() {
  return request({
    url: '/attendance/clock-in',
    method: 'post'
  })
}

export function clockOut() {
  return request({
    url: '/attendance/clock-out',
    method: 'post'
  })
}

export function getDepartmentAttendanceSummary(month, departmentId) {
  return request({
    url: '/attendance/department-summary',
    method: 'get',
    params: { month, department_id: departmentId }
  })
}
