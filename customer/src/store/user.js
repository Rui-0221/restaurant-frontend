import { defineStore } from 'pinia'
import { getToken, setToken, clearToken, getUser, setUser, clearUser } from '../utils/storage'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getUser(),
  }),
  getters: {
    isLogin: (state) => !!state.token,
  },
  actions: {
    // token 是裸字符串，userInfo 通过 /users/me 补齐
    setLogin(token, userInfo = null) {
      this.token = token
      this.userInfo = userInfo
      setToken(token)
      if (userInfo) setUser(userInfo)
    },
    setInfo(userInfo) {
      this.userInfo = userInfo
      setUser(userInfo)
    },
    logout() {
      this.token = ''
      this.userInfo = null
      clearToken()
      clearUser()
    },
  },
})
