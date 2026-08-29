import axios from 'axios'
import { showToast } from 'vant'
import { getToken, clearToken } from '../utils/storage'
import { notifyCustomerUnauthorized } from '../utils/unauthorized'
import { clearAiOrderSession } from '../utils/aiOrderSession'

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
    // AI 点餐的安全失败会用 code=0 携带 MANUAL_ORDER 数据。
    // 仅显式声明的请求可读取该数据，其他接口仍保持原有拒绝行为。
    if (response.config.acceptBusinessData && res.data != null) {
      return res.data
    }
    if (!response.config.suppressBusinessToast) showToast(res.msg || '请求失败')
    return Promise.reject(new Error(res.msg || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg
    if (status === 401) {
      clearToken()
      clearAiOrderSession()
      notifyCustomerUnauthorized()
      showToast('登录已过期，请重新登录')
      const currentPath = location.hash.startsWith('#/') ? location.hash.slice(1) : '/'
      if (!currentPath.startsWith('/login')) {
        location.hash = `#/login?redirect=${encodeURIComponent(currentPath)}`
      }
    } else if (!error.config?.suppressBusinessToast) {
      showToast(msg || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default request
