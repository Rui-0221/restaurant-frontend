export async function recoverOrderState(orderId, { loadOrders, getOrder }) {
  await loadOrders()
  return getOrder(orderId)
}
