import request from './index'

export const getDishAiProfiles = () => request.get('/admin/dish-ai-profiles')

export const getDishAiProfile = (dishId) => request.get(`/admin/dish-ai-profiles/${dishId}`)

export const saveDishAiProfile = (dishId, profile) =>
  request.put(`/admin/dish-ai-profiles/${dishId}`, profile)
