import { getTableActiveOrder, scanOrder as defaultScanOrder } from '../api/order.js'
import { normalizeTableId } from '../router/tableRoutes.js'

export const TERMINAL_ORDER_CONFLICT = '订单已取消或已结账，不能继续加菜'

const errorMessage = (error) => error?.response?.data?.msg || error?.message || ''

const snapshotItems = (items) =>
  (items || []).map((item) => ({ dishId: item.dishId, amount: item.amount }))

export async function submitOrderWithRecovery({
  tableId,
  mode,
  activeOrder = null,
  items,
  scanOrder = defaultScanOrder,
  getActiveOrder = getTableActiveOrder,
  confirmRecovery = async () => false,
}) {
  const normalizedTableId = normalizeTableId(tableId)
  const itemSnapshot = snapshotItems(items)
  const payload = { tableId: Number(normalizedTableId), items: itemSnapshot }
  const submitOnce = () => scanOrder(payload, { suppressBusinessToast: true })

  try {
    return { kind: 'success', order: await submitOnce(), retried: false }
  } catch (error) {
    if (errorMessage(error) !== TERMINAL_ORDER_CONFLICT) {
      return { kind: 'error', error, mode, activeOrder, items: itemSnapshot }
    }
  }

  let nextActiveOrder
  try {
    nextActiveOrder = await getActiveOrder(normalizedTableId)
  } catch (error) {
    return { kind: 'recovery-error', error, mode, activeOrder, items: itemSnapshot }
  }

  const nextMode = nextActiveOrder ? 'add' : 'new'
  const shouldRetry = await confirmRecovery({
    tableId: normalizedTableId,
    mode: nextMode,
    activeOrder: nextActiveOrder || null,
    items: itemSnapshot,
  })
  if (!shouldRetry) {
    return {
      kind: 'cancelled',
      mode: nextMode,
      activeOrder: nextActiveOrder || null,
      items: itemSnapshot,
    }
  }

  try {
    return {
      kind: 'success',
      order: await submitOnce(),
      retried: true,
      mode: nextMode,
      activeOrder: nextActiveOrder || null,
    }
  } catch (error) {
    return {
      kind: 'retry-error',
      error,
      mode: nextMode,
      activeOrder: nextActiveOrder || null,
      items: itemSnapshot,
    }
  }
}
