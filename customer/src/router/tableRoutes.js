export function normalizeTableId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? String(value) : null
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const normalized = Number(value)
  return Number.isSafeInteger(normalized) && normalized > 0 ? String(normalized) : null
}

const scopedPath = (tableId, suffix = '') => {
  const normalized = normalizeTableId(tableId)
  return normalized === null ? null : `/table/${normalized}${suffix}`
}

export const tableLandingPath = (tableId) => scopedPath(tableId)
export const tableMenuPath = (tableId) => scopedPath(tableId, '/menu')
export const tableCartPath = (tableId) => scopedPath(tableId, '/cart')
export const tableAiOrderPath = (tableId) => scopedPath(tableId, '/ai-order')
