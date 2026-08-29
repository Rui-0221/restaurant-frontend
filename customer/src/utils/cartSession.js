import { normalizeTableId } from '../router/tableRoutes.js'
import { ORDER_LIMITS } from './constants.js'

export const CART_SESSION_KEY = 'customer_cart_context_v1'
const CART_SESSION_VERSION = 1

const storage = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage)

const clearStoredSession = () => {
  try {
    storage()?.removeItem(CART_SESSION_KEY)
  } catch {
    // Storage can be unavailable or blocked; the in-memory cart remains usable.
  }
}

export const clearCartSession = () => {
  clearStoredSession()
}

const normalizeDish = (dish) => {
  if (!dish || typeof dish !== 'object') return null
  const id = normalizeTableId(dish.id)
  const price = Number(dish.price)
  const categoryId = dish.categoryId == null ? 0 : Number(dish.categoryId)
  if (
    id === null ||
    typeof dish.name !== 'string' ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(categoryId) ||
    categoryId < 0
  ) {
    return null
  }

  return {
    id: Number(id),
    name: dish.name,
    description: typeof dish.description === 'string' ? dish.description : '',
    price,
    image: typeof dish.image === 'string' ? dish.image : '',
    categoryId,
  }
}

const normalizeItems = (items) => {
  const source = Array.isArray(items) ? items : Object.values(items ?? {})
  if (source.length > ORDER_LIMITS.maxKinds) return null

  const seen = new Set()
  const normalized = []
  for (const item of source) {
    const dish = normalizeDish(item?.dish)
    const amount = Number(item?.amount)
    if (
      !dish ||
      seen.has(dish.id) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > ORDER_LIMITS.maxAmountPerDish
    ) {
      return null
    }
    seen.add(dish.id)
    normalized.push({ dish, amount })
  }
  return normalized
}

export const saveCartSession = (tableId, items) => {
  const normalizedTableId = normalizeTableId(tableId)
  const normalizedItems = normalizeItems(items)
  if (normalizedTableId === null || normalizedItems === null) {
    clearStoredSession()
    return false
  }

  try {
    storage()?.setItem(
      CART_SESSION_KEY,
      JSON.stringify({
        version: CART_SESSION_VERSION,
        tableId: normalizedTableId,
        items: normalizedItems,
      }),
    )
    return true
  } catch {
    clearStoredSession()
    return false
  }
}

export const loadCartSession = (tableId) => {
  const expectedTableId = normalizeTableId(tableId)
  if (expectedTableId === null) {
    clearStoredSession()
    return null
  }

  let payload
  try {
    const raw = storage()?.getItem(CART_SESSION_KEY)
    if (!raw) return null
    payload = JSON.parse(raw)
  } catch {
    clearStoredSession()
    return null
  }

  const items = normalizeItems(payload?.items)
  if (
    payload?.version !== CART_SESSION_VERSION ||
    normalizeTableId(payload?.tableId) !== expectedTableId ||
    !Array.isArray(payload?.items) ||
    items === null
  ) {
    clearStoredSession()
    return null
  }

  return { tableId: expectedTableId, items }
}
