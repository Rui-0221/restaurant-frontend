import { getUser } from './storage'
import { createRequestId } from './requestId'

const KEY = 'customer_order_request_v1'
export function orderRequest(tableId, items) {
  const fingerprint = JSON.stringify([
    getUser()?.id,
    String(tableId),
    items.map((i) => [i.dishId, i.amount]).sort((a, b) => a[0] - b[0]),
  ])
  let previous
  try {
    previous = JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    /* 重新创建损坏的请求记录。 */
  }
  if (previous?.fingerprint === fingerprint && previous.requestId) return previous.requestId
  const requestId = createRequestId()
  sessionStorage.setItem(KEY, JSON.stringify({ fingerprint, requestId }))
  return requestId
}
export function completeOrderRequest(requestId) {
  let current
  try {
    current = JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return
  }
  if (current?.requestId === requestId) sessionStorage.removeItem(KEY)
}
