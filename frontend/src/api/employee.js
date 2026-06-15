import request from '@/utils/request'

export function getEmployeeList(params) {
  return request({
    url: '/employees',
    method: 'get',
    params
  })
}

export function getEmployee(id) {
  return request({
    url: `/employees/${id}`,
    method: 'get'
  })
}

export function getEmployeeAttendanceSummary(id, month) {
  return request({
    url: `/employees/${id}/attendance-summary`,
    method: 'get',
    params: { month }
  })
}

export function getEmployeeHRSummary(id) {
  return request({
    url: `/employees/${id}/hr-summary`,
    method: 'get'
  })
}

export function createEmployee(data) {
  return request({
    url: '/employees',
    method: 'post',
    data
  })
}

export function updateEmployee(id, data) {
  return request({
    url: `/employees/${id}`,
    method: 'put',
    data
  })
}

export function deleteEmployee(id) {
  return request({
    url: `/employees/${id}`,
    method: 'delete'
  })
}
