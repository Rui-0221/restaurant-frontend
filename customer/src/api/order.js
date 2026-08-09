import request from './index'

// 订单接口
export const scanOrder = (data) => request.post('/orders/scan-order', data)
export const getTableActiveOrder = (tableId) => request.get(`/orders/table/${tableId}/active`)
