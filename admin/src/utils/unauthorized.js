export const ADMIN_UNAUTHORIZED_EVENT = 'admin-unauthorized'

export const notifyAdminUnauthorized = () =>
  window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT))

export const bindAdminUnauthorizedLogout = (authStore) => {
  const logout = () => authStore.logout()
  window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, logout)
  return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, logout)
}
