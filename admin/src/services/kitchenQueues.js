export function buildKitchenQueues(orders) {
  const byCreateTime = (left, right) => new Date(left.createTime) - new Date(right.createTime)
  return {
    pending: (orders || []).filter((order) => order.status === 1).sort(byCreateTime),
    cooking: (orders || []).filter((order) => order.status === 2).sort(byCreateTime),
  }
}
