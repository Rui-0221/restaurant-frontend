import { beforeEach, describe, expect, it } from 'vitest'
import { orderRequest, completeOrderRequest } from './orderRequest'
import { setUser } from './storage'
describe('普通订单请求去重', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setUser({ id: 7 })
  })
  it('相同内容在失败或刷新后复用请求 ID，成功后创建新 ID', () => {
    const items = [{ dishId: 1, amount: 2 }]
    const id = orderRequest(3, items)
    expect(orderRequest(3, items)).toBe(id)
    completeOrderRequest(id)
    expect(orderRequest(3, items)).not.toBe(id)
  })
  it('绑定用户、桌台和菜品数量，排序不影响重试', () => {
    const items = [
      { dishId: 1, amount: 2 },
      { dishId: 2, amount: 1 },
    ]
    const id = orderRequest(3, items)
    expect(orderRequest(3, [...items].reverse())).toBe(id)
    expect(orderRequest(4, items)).not.toBe(id)
    setUser({ id: 8 })
    expect(orderRequest(3, items)).not.toBe(id)
  })
  it('旧请求完成不会删除新的待重试请求', () => {
    const old = orderRequest(3, [{ dishId: 1, amount: 1 }])
    const latest = orderRequest(3, [{ dishId: 1, amount: 2 }])
    completeOrderRequest(old)
    expect(orderRequest(3, [{ dishId: 1, amount: 2 }])).toBe(latest)
  })
})
