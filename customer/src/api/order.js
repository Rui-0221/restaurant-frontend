import request from './index'

// 订单接口
export const scanOrder = (data, options = {}) =>
  request.post('/orders/scan-order', data, { suppressBusinessToast: options.suppressBusinessToast })
export const getTableActiveOrder = (tableId) => request.get(`/orders/table/${tableId}/active`)
export const getMyOrders = () => request.get('/orders/user/history')
