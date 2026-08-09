import request from './index'

// 菜单接口（公开）
export const getOnSaleDishes = () => request.get('/dishes/on-sale')
export const getCategories = () => request.get('/categories')
