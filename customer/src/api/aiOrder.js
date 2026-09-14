import request from './index'
import { getToken } from '../utils/storage'

export const chatAiOrder = (data, { signal } = {}) =>
  request.post('/users/ai-order/chat', data, {
    signal,
    timeout: 25000,
    acceptBusinessData: true,
    suppressBusinessToast: true,
  })

// keepalive 使路由离开或 pagehide 后取消通知仍有机会送达。
export const cancelAiOrder = (requestId) =>
  fetch('/api/users/ai-order/cancel', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ requestId }),
  })

export const getAiOrderMeal = (tableId) => request.get(`/users/ai-order/meal/${tableId}`)
