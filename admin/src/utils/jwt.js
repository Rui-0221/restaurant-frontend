// 前端解析 JWT payload（仅解码，不验签 —— 服务端强校验）
// 员工 token: {sub: employeeId, type: 'employee', role, exp}
// 用户 token: {sub: userId, type: 'user', exp}
export function decodeJwt(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}
