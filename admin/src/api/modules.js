import request from './index'

// 员工账号
export const employeeLogin = (data) => request.post('/employees/login', data) // 返回 {token, name}
export const getEmployees = () => request.get('/employees')
export const addEmployee = (data) => request.post('/employees', data)
export const updateEmployee = (data) => request.put('/employees', data)
export const deleteEmployee = (id) => request.delete(`/employees/${id}`)
export const changePassword = (oldPassword, newPassword) =>
  request.put('/employees/password', null, { params: { oldPassword, newPassword } })

// 菜品
export const getDishes = () => request.get('/dishes')
export const getOnSaleDishes = () => request.get('/dishes/on-sale')
export const addDish = (data) => request.post('/dishes', data)
export const updateDish = (data) => request.put('/dishes', data)
export const deleteDish = (id) => request.delete(`/dishes/${id}`)

// 分类
export const getCategories = () => request.get('/categories')
export const addCategory = (data) => request.post('/categories', data)
export const updateCategory = (data) => request.put('/categories', data)
export const deleteCategory = (id) => request.delete(`/categories/${id}`)

// 桌台
export const getTables = () => request.get('/tables')
export const addTable = (data) => request.post('/tables', data)
export const updateTable = (data) => request.put('/tables', data)
export const deleteTable = (id) => request.delete(`/tables/${id}`)
export const changeTableStatus = (id, status) =>
  request.put(`/tables/${id}/status`, null, { params: { status } })

// 订单
export const getOrders = (page = 1, size = 20) =>
  request.get('/orders', { params: { page, size } })
export const getOrder = (id) => request.get(`/orders/${id}`)
export const changeOrderStatus = (id, status) =>
  request.put(`/orders/${id}/status`, null, { params: { status } })
export const getTodayStatistics = () => request.get('/orders/statistics/today')

// 帮顾客点餐（员工代下单，userId 不传，订单归属桌台）
export const scanOrder = (data) => request.post('/orders/scan-order', data)
