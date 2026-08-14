import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from './cart'
import { ORDER_LIMITS } from '../utils/constants'

const dish = (id) => ({ id, name: `菜品${id}`, price: 10 })

describe('cart store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('保留同桌购物车，但在切换桌台时清空', () => {
    const cart = useCartStore()
    cart.setContext(1, 'new')
    cart.addItem(dish(1))

    cart.setContext('1', 'add', { id: 10 })
    expect(cart.totalCount).toBe(1)

    cart.setContext(2, 'new')
    expect(cart.items).toEqual({})
    expect(cart.tableId).toBe(2)
  })

  it('拒绝超过单菜数量和菜品种类上限的修改', () => {
    const cart = useCartStore()
    expect(cart.setItemAmount(dish(1), ORDER_LIMITS.maxAmountPerDish)).toEqual({ ok: true })
    expect(cart.addItem(dish(1))).toEqual({ ok: false, message: `单个菜品最多 ${ORDER_LIMITS.maxAmountPerDish} 份` })

    for (let id = 2; id <= ORDER_LIMITS.maxKinds; id += 1) {
      expect(cart.addItem(dish(id))).toEqual({ ok: true })
    }
    expect(cart.addItem(dish(ORDER_LIMITS.maxKinds + 1))).toEqual({
      ok: false,
      message: `一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品`,
    })
  })
})
