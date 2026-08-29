import { beforeEach, describe, expect, it } from 'vitest'
import { CART_SESSION_KEY, clearCartSession, loadCartSession, saveCartSession } from './cartSession'

const dish = (id, overrides = {}) => ({
  id,
  name: `菜品${id}`,
  description: '',
  price: 10,
  image: '',
  categoryId: 1,
  ...overrides,
})

describe('cart session persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saves and restores only the table-scoped display cart', () => {
    saveCartSession('001', [{ dish: dish(1), amount: 2 }])

    expect(loadCartSession(1)).toEqual({ tableId: '1', items: [{ dish: dish(1), amount: 2 }] })
    expect(JSON.parse(sessionStorage.getItem(CART_SESSION_KEY))).toEqual({
      version: 1,
      tableId: '1',
      items: [{ dish: dish(1), amount: 2 }],
    })
  })

  it('rejects another table and clears the old session', () => {
    saveCartSession(1, [{ dish: dish(1), amount: 1 }])

    expect(loadCartSession(2)).toBeNull()
    expect(sessionStorage.getItem(CART_SESSION_KEY)).toBeNull()
  })

  it.each([
    '{broken json',
    JSON.stringify({ version: 2, tableId: '1', items: [] }),
    JSON.stringify({ version: 1, tableId: '1' }),
    JSON.stringify({ version: 1, tableId: '1', items: [{ dish: dish(1), amount: 0 }] }),
    JSON.stringify({ version: 1, tableId: '1', items: [{ dish: dish(1), amount: 100 }] }),
    JSON.stringify({
      version: 1,
      tableId: '1',
      items: Array.from({ length: 51 }, (_, index) => ({ dish: dish(index + 1), amount: 1 })),
    }),
  ])('self-heals invalid session payload %s', (payload) => {
    sessionStorage.setItem(CART_SESSION_KEY, payload)

    expect(loadCartSession(1)).toBeNull()
    expect(sessionStorage.getItem(CART_SESSION_KEY)).toBeNull()
  })

  it('clears the session explicitly', () => {
    saveCartSession(1, [])
    clearCartSession()

    expect(sessionStorage.getItem(CART_SESSION_KEY)).toBeNull()
  })
})
