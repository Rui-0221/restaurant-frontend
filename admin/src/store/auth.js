import { defineStore } from 'pinia'
import {
  getToken, setToken, clearToken,
  getEmployeeName, setEmployeeName, clearEmployeeName,
  getRole, setRole, clearRole,
  getEmployeeId, setEmployeeId, clearEmployeeId,
} from '../utils/storage'
import { decodeJwt } from '../utils/jwt'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    name: getEmployeeName(),
    role: getRole(),
    employeeId: getEmployeeId(),
  }),
  getters: {
    isLogin: (state) => !!state.token,
    isAdmin: (state) => state.role === 1,
    isWaiter: (state) => state.role === 2,
    isChef: (state) => state.role === 3,
  },
  actions: {
    // 登录响应只有 {token, name}，角色和 ID 从 JWT payload 解码
    setLogin(token, name) {
      this.token = token
      this.name = name
      const payload = decodeJwt(token)
      this.role = payload?.role ?? null
      this.employeeId = payload?.sub ? Number(payload.sub) : null
      setToken(token)
      setEmployeeName(name)
      setRole(this.role)
      setEmployeeId(this.employeeId)
    },
    logout() {
      this.token = ''
      this.name = ''
      this.role = null
      this.employeeId = null
      clearToken()
      clearEmployeeName()
      clearRole()
      clearEmployeeId()
    },
  },
})
