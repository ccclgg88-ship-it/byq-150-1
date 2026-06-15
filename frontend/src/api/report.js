import request from '@/utils/request'

export function getDepartmentAttendanceRate(month) {
  return request({
    url: '/reports/department-attendance率',
    method: 'get',
    params: { month }
  })
}

export function getDepartmentAttendanceRateReport(month) {
  return request({
    url: '/reports/department-attendance-rate',
    method: 'get',
    params: { month }
  })
}

export function getLeaveTypeStatistics(month) {
  return request({
    url: '/reports/leave-type-statistics',
    method: 'get',
    params: { month }
  })
}

export function exportDepartmentAttendance(month, departmentId) {
  return request({
    url: '/reports/export/department-attendance',
    method: 'get',
    params: { month, department_id: departmentId },
    responseType: 'blob'
  })
}
