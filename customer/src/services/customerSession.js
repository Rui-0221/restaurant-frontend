import { login, getMe } from '../api/user'
import { setToken, clearToken } from '../utils/storage'

// 登录接口返回裸 token；资料接口依赖请求拦截器从 storage 读取该 token。
export async function loginAndLoadProfile(credentials) {
  const token = await login(credentials)
  setToken(token)
  try {
    const userInfo = await getMe()
    return { token, userInfo }
  } catch (error) {
    clearToken()
    throw error
  }
}
