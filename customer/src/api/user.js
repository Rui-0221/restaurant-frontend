import request from './index'

// 顾客账号接口
export const login = (data) => request.post('/users/login', data) // 注意：返回的是裸 token 字符串
export const register = (data) => request.post('/users/register', data)
export const getMe = () => request.get('/users/me')
