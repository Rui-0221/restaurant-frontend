import { describe, expect, it } from 'vitest'
import router from './index'

describe('AI 菜品手册路由', () => {
  it('使用管理员权限保护手册页面', () => {
    const route = router.getRoutes().find((item) => item.name === 'dishAiProfiles')

    expect(route.path).toBe('/dish-ai-profiles')
    expect(route.meta.adminOnly).toBe(true)
  })
})
