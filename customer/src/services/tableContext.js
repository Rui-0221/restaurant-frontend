import { getTableActiveOrder } from '../api/order.js'
import { normalizeTableId } from '../router/tableRoutes.js'

export async function synchronizeTableContext(
  tableId,
  { cartStore, getActiveOrder = getTableActiveOrder } = {},
) {
  const normalizedTableId = normalizeTableId(tableId)
  if (normalizedTableId === null) {
    return { tableId: null, activeOrder: null, error: null }
  }

  cartStore.hydrateForTable(normalizedTableId)
  try {
    const activeOrder = await getActiveOrder(normalizedTableId)
    cartStore.setContext(normalizedTableId, activeOrder ? 'add' : 'new', activeOrder)
    return { tableId: normalizedTableId, activeOrder: activeOrder || null, error: null }
  } catch (error) {
    return { tableId: normalizedTableId, activeOrder: null, error }
  }
}
