import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, clearToken } from '../utils/storage'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：自动携带员工 token
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
      return res.data
    }
    ElMessage.error(res.msg || '请求失败')
    return Promise.reject(new Error(res.msg || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg
    if (status === 401) {
      clearToken()
      ElMessage.error(msg || '登录已过期，请重新登录')
      if (!location.hash.includes('/login')) {
        location.hash = '#/login'
      }
    } else {
      ElMessage.error(msg || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default request
