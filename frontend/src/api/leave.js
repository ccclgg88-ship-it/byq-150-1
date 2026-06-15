import request from '@/utils/request'

export function getMyLeaves(params) {
  return request({
    url: '/leave/my-leaves',
    method: 'get',
    params
  })
}

export function getPendingLeaves(params) {
  return request({
    url: '/leave/pending',
    method: 'get',
    params
  })
}

export function getPendingCount() {
  return request({
    url: '/leave/pending-count',
    method: 'get'
  })
}

export function getLeaveDetail(id) {
  return request({
    url: `/leave/${id}`,
    method: 'get'
  })
}

export function applyLeave(data) {
  return request({
    url: '/leave',
    method: 'post',
    data
  })
}

export function approveLeave(id) {
  return request({
    url: `/leave/${id}/approve`,
    method: 'post'
  })
}

export function rejectLeave(id) {
  return request({
    url: `/leave/${id}/reject`,
    method: 'post'
  })
}
