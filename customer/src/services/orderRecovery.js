import { getMyOrders, getTableActiveOrder } from '../api/order'

export async function recoverOrderById(orderId, tableId = null) {
  const normalizedId = Number(orderId)
  if (!Number.isInteger(normalizedId) || normalizedId < 1) return null

  const myOrders = await getMyOrders()
  const historical = (myOrders || []).find((item) => Number(item.id) === normalizedId)
  if (historical) return historical

  if (!tableId) return null
  const activeOrder = await getTableActiveOrder(tableId)
  return activeOrder && Number(activeOrder.id) === normalizedId ? activeOrder : null
}
