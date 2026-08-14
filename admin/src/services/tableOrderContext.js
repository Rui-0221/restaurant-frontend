export function resolveTableOrderContext(table, activeOrder) {
  if (activeOrder) {
    return table?.status === 0
      ? { kind: 'inconsistent', message: `桌台显示空闲，但存在活跃订单 #${activeOrder.id}；请刷新桌台状态或联系管理员` }
      : { kind: 'busy', message: `将追加到活跃订单 #${activeOrder.id}` }
  }
  return table?.status === 1
    ? { kind: 'warning', message: '桌台显示占用但没有活跃订单；提交将创建新订单' }
    : { kind: 'free', message: '该桌空闲，提交将创建新订单' }
}
