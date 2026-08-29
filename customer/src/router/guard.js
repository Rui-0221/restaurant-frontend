import { normalizeTableId } from './tableRoutes.js'

const TABLE_ROUTE_NAMES = new Set(['landing', 'table-menu', 'table-cart', 'table-ai-order'])
const PROTECTED_ROUTE_NAMES = new Set([
  'table-menu',
  'table-cart',
  'table-ai-order',
  'order-detail',
  'profile',
])

export function resolveCustomerRoute(to, isLogin) {
  if (TABLE_ROUTE_NAMES.has(to.name) && normalizeTableId(to.params?.tableId) === null) {
    return { name: 'entry' }
  }

  if (PROTECTED_ROUTE_NAMES.has(to.name) && !isLogin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
}
