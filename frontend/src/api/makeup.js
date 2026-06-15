import request from '@/utils/request'

export function getMyMakeups(params) {
  return request({
    url: '/makeup/my-makeups',
    method: 'get',
    params
  })
}

export function getPendingMakeups(params) {
  return request({
    url: '/makeup/pending',
    method: 'get',
    params
  })
}

export function getPendingMakeupCount() {
  return request({
    url: '/makeup/pending-count',
    method: 'get'
  })
}

export function getMakeupDetail(id) {
  return request({
    url: `/makeup/${id}`,
    method: 'get'
  })
}

export function applyMakeup(data) {
  return request({
    url: '/makeup',
    method: 'post',
    data
  })
}

export function revokeMakeup(id) {
  return request({
    url: `/makeup/${id}/revoke`,
    method: 'post'
  })
}

export function approveMakeup(id) {
  return request({
    url: `/makeup/${id}/approve`,
    method: 'post'
  })
}

export function rejectMakeup(id, reason) {
  return request({
    url: `/makeup/${id}/reject`,
    method: 'post',
    data: { reject_reason: reason }
  })
}
