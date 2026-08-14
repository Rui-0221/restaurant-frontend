import { ORDER_STATUS } from '../utils/constants'

export function describeTableCard(table, activeOrder) {
  if (table.status === 1 && activeOrder) {
    return {
      kind: 'active',
      title: `活跃订单 #${activeOrder.id}`,
      detail: ORDER_STATUS[activeOrder.status]?.label || '状态未知',
    }
  }
  if (table.status === 1) {
    return { kind: 'warning', title: '异常占用', detail: '未查询到活跃订单' }
  }
  if (activeOrder) {
    return {
      kind: 'warning',
      title: '状态待同步',
      detail: `活跃订单 #${activeOrder.id}`,
    }
  }
  return { kind: 'idle', title: '当前空闲', detail: '可直接开始点餐' }
}
