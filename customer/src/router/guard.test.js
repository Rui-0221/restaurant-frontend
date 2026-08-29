import { describe, expect, it } from 'vitest'
import { resolveCustomerRoute } from './guard'

describe('customer route guard', () => {
  it('redirects unauthenticated scoped pages to login with the exact full path', () => {
    expect(
      resolveCustomerRoute(
        { name: 'table-cart', params: { tableId: '1' }, fullPath: '/table/1/cart' },
        false,
      ),
    ).toEqual({ name: 'login', query: { redirect: '/table/1/cart' } })
  })

  it.each([
    { name: 'landing', params: { tableId: '0' }, fullPath: '/table/0' },
    { name: 'table-menu', params: { tableId: 'abc' }, fullPath: '/table/abc/menu' },
    { name: 'table-cart', params: { tableId: '-1' }, fullPath: '/table/-1/cart' },
  ])('sends invalid table routes to entry: %p', (to) => {
    expect(resolveCustomerRoute(to, true)).toEqual({ name: 'entry' })
  })

  it('allows a valid authenticated scoped route', () => {
    const to = {
      name: 'table-ai-order',
      params: { tableId: '001' },
      fullPath: '/table/001/ai-order',
    }
    expect(resolveCustomerRoute(to, true)).toBe(true)
  })

  it('protects the AI ordering route with customer login', () => {
    const to = { name: 'table-ai-order', params: { tableId: '1' }, fullPath: '/table/1/ai-order' }
    expect(resolveCustomerRoute(to, false)).toEqual({
      name: 'login',
      query: { redirect: '/table/1/ai-order' },
    })
  })

  it('does not redirect login or entry routes', () => {
    expect(resolveCustomerRoute({ name: 'login', fullPath: '/login' }, false)).toBe(true)
    expect(resolveCustomerRoute({ name: 'entry', fullPath: '/' }, false)).toBe(true)
  })
})
