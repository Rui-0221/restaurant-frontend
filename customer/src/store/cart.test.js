import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from './cart'
import { ORDER_LIMITS } from '../utils/constants'

const dish = (id) => ({
  id,
  name: `菜品${id}`,
  description: '',
  price: 10,
  image: '',
  categoryId: 1,
})

describe('cart store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
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
    expect(cart.addItem(dish(1))).toEqual({
      ok: false,
      message: `单个菜品最多 ${ORDER_LIMITS.maxAmountPerDish} 份`,
    })

    for (let id = 2; id <= ORDER_LIMITS.maxKinds; id += 1) {
      expect(cart.addItem(dish(id))).toEqual({ ok: true })
    }
    expect(cart.addItem(dish(ORDER_LIMITS.maxKinds + 1))).toEqual({
      ok: false,
      message: `一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品`,
    })
  })

  it('restores an existing same-table cart and excludes mode and active order from storage', () => {
    const first = useCartStore()
    first.setContext(1, 'new')
    first.addItem(dish(1))
    first.setContext('1', 'add', { id: 10 })

    const secondPinia = createPinia()
    setActivePinia(secondPinia)
    const second = useCartStore()
    second.setContext(1, 'new')
    second.hydrateForTable(1)

    expect(second.list).toEqual([{ dish: dish(1), amount: 1 }])
    expect(second.mode).toBe('new')
    expect(second.activeOrder).toBeNull()
    expect(JSON.parse(sessionStorage.getItem('customer_cart_context_v1'))).toEqual({
      version: 1,
      tableId: '1',
      items: [{ dish: dish(1), amount: 1 }],
    })
  })

  it('clears memory and session when switching to another table', () => {
    const cart = useCartStore()
    cart.setContext(1, 'new')
    cart.addItem(dish(1))

    cart.setContext(2, 'new')

    expect(cart.items).toEqual({})
    expect(sessionStorage.getItem('customer_cart_context_v1')).toBe(
      JSON.stringify({ version: 1, tableId: '2', items: [] }),
    )
  })

  it('persists clear and submit reset while retaining the table context', () => {
    const cart = useCartStore()
    cart.setContext(1, 'new')
    cart.addItem(dish(1))
    cart.clear()
    expect(JSON.parse(sessionStorage.getItem('customer_cart_context_v1')).items).toEqual([])

    cart.addItem(dish(1))
    cart.resetAfterSubmit()
    expect(cart.tableId).toBe(1)
    expect(JSON.parse(sessionStorage.getItem('customer_cart_context_v1'))).toEqual({
      version: 1,
      tableId: '1',
      items: [],
    })
  })
})
