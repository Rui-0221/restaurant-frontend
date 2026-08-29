import request from './index'

export const chatAiOrder = (data) =>
  request.post('/users/ai-order/chat', data, {
    acceptBusinessData: true,
    suppressBusinessToast: true,
  })

export const confirmAiOrder = (data) =>
  request.post('/users/ai-order/confirm', data, { suppressBusinessToast: true })
