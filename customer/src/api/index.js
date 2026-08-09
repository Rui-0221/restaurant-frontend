import axios from 'axios'
import { showToast } from 'vant'
import { getToken, clearToken } from '../utils/storage'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：自动携带顾客 token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：解包 Result 信封 {code, msg, data}
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 1) {
      return res.data // 直接返回 data，页面无需再解包
    }
    showToast(res.msg || '请求失败')
    return Promise.reject(new Error(res.msg || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg
    if (status === 401) {
      clearToken()
      showToast('登录已过期，请重新登录')
      // 顾客端统一回落地页，避免游客误入受限页面
      if (!location.hash.includes('/login')) {
        location.hash = '#/login'
      }
    } else {
      showToast(msg || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
