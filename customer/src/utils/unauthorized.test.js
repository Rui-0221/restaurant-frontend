import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../store/user'
import { bindCustomerUnauthorizedLogout, notifyCustomerUnauthorized } from './unauthorized'

describe('customer unauthorized logout', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('同步清理 Pinia 和 storage 身份状态', () => {
    const user = useUserStore()
    user.setLogin('token-123', { id: 1, name: '顾客' })
    const unbind = bindCustomerUnauthorizedLogout(user)

    notifyCustomerUnauthorized()

    expect(user.isLogin).toBe(false)
    expect(user.userInfo).toBeNull()
    expect(localStorage.getItem('customer_token')).toBeNull()
    expect(localStorage.getItem('customer_user')).toBeNull()
    unbind()
  })
})
