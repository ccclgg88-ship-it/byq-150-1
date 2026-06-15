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

export function updateContact(data) {
  return request({
    url: '/auth/profile/contact',
    method: 'put',
    data
  })
}

export function updatePassword(old_password, new_password) {
  return request({
    url: '/auth/profile/password',
    method: 'put',
    data: { old_password, new_password }
  })
}

export function getProfileSummary() {
  return request({
    url: '/auth/profile/summary',
    method: 'get'
  })
}

