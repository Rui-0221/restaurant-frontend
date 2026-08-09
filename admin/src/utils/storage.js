// 员工端存储工具 —— 与顾客端隔离，key 固定 employee_ 前缀
const TOKEN_KEY = 'employee_token'
const NAME_KEY = 'employee_name'
const ROLE_KEY = 'employee_role'
const ID_KEY = 'employee_id'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const getEmployeeName = () => localStorage.getItem(NAME_KEY) || ''
export const setEmployeeName = (n) => localStorage.setItem(NAME_KEY, n)
export const clearEmployeeName = () => localStorage.removeItem(NAME_KEY)

export const getRole = () => Number(localStorage.getItem(ROLE_KEY)) || null
export const setRole = (r) => localStorage.setItem(ROLE_KEY, r)
export const clearRole = () => localStorage.removeItem(ROLE_KEY)

export const getEmployeeId = () => Number(localStorage.getItem(ID_KEY)) || null
export const setEmployeeId = (id) => localStorage.setItem(ID_KEY, id)
export const clearEmployeeId = () => localStorage.removeItem(ID_KEY)
