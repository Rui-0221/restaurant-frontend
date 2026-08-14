import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../store/auth'
import { bindAdminUnauthorizedLogout, notifyAdminUnauthorized } from './unauthorized'

describe('admin unauthorized logout', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('同步清理员工 Pinia 和 storage 身份状态', () => {
    const auth = useAuthStore()
    auth.$patch({ token: 'token-123', name: '服务员', role: 2, employeeId: 9 })
    localStorage.setItem('employee_token', 'token-123')
    localStorage.setItem('employee_name', '服务员')
    localStorage.setItem('employee_role', '2')
    localStorage.setItem('employee_id', '9')
    const unbind = bindAdminUnauthorizedLogout(auth)

    notifyAdminUnauthorized()

    expect(auth.isLogin).toBe(false)
    expect(auth.role).toBeNull()
    expect(auth.employeeId).toBeNull()
    expect(localStorage.getItem('employee_token')).toBeNull()
    expect(localStorage.getItem('employee_role')).toBeNull()
    unbind()
  })
})
