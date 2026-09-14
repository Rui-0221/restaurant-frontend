import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from './cart'
describe('购物车批量合并', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })
  it('合并已有数量，保留已有菜品信息', () => {
    const cart = useCartStore()
    cart.setContext(1, 'new')
    cart.addItem({ id: 1, name: '手动菜品', price: 10 })
    expect(cart.addItems([{ dish: { id: 1, name: '推荐菜品', price: 11 }, amount: 2 }]).ok).toBe(
      true,
    )
    expect(cart.items[1]).toMatchObject({ amount: 3, dish: { name: '手动菜品', price: 10 } })
  })
  it('任何一项超限时整批不写入', () => {
    const cart = useCartStore()
    cart.setContext(1, 'new')
    cart.setItemAmount({ id: 1, name: '已有菜品', price: 10 }, 99)
    const before = JSON.stringify(cart.items)
    expect(
      cart.addItems([
        { dish: { id: 2, name: '新菜品', price: 10 }, amount: 1 },
        { dish: { id: 1, name: '已有菜品', price: 10 }, amount: 1 },
      ]).ok,
    ).toBe(false)
    expect(JSON.stringify(cart.items)).toBe(before)
  })
})
