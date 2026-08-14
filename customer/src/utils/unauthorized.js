export const CUSTOMER_UNAUTHORIZED_EVENT = 'customer-unauthorized'

export const notifyCustomerUnauthorized = () =>
  window.dispatchEvent(new Event(CUSTOMER_UNAUTHORIZED_EVENT))

export const bindCustomerUnauthorizedLogout = (userStore) => {
  const logout = () => userStore.logout()
  window.addEventListener(CUSTOMER_UNAUTHORIZED_EVENT, logout)
  return () => window.removeEventListener(CUSTOMER_UNAUTHORIZED_EVENT, logout)
}
