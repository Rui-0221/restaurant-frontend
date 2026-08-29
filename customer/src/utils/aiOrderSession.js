import { normalizeTableId } from '../router/tableRoutes'

const SESSION_KEY = 'customer_ai_order_session_v1'

const identity = (userId) => String(userId ?? '')

export function clearAiOrderSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function loadAiOrderSession(userId, tableId) {
  const normalizedTableId = normalizeTableId(tableId)
  if (normalizedTableId === null) {
    clearAiOrderSession()
    return null
  }

  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    if (
      !stored ||
      stored.version !== 1 ||
      stored.userId !== identity(userId) ||
      stored.tableId !== normalizedTableId ||
      !Array.isArray(stored.session?.messages)
    ) {
      clearAiOrderSession()
      return null
    }
    return stored.session
  } catch {
    clearAiOrderSession()
    return null
  }
}

export function saveAiOrderSession(userId, tableId, session) {
  const normalizedTableId = normalizeTableId(tableId)
  if (normalizedTableId === null || !Array.isArray(session?.messages)) {
    clearAiOrderSession()
    return
  }

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      version: 1,
      userId: identity(userId),
      tableId: normalizedTableId,
      session,
    }),
  )
}
