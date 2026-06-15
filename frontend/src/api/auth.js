import request from '@/utils/request'

export function login(employeeNo, password) {
  return request({
    url: '/auth/login',
    method: 'post',
    data: { employee_no: employeeNo, password }
  })
}

export function getProfile() {
  return request({
    url: '/auth/profile',
    method: 'get'
  })
}
