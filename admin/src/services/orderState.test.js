import { describe, expect, it, vi } from 'vitest'
import { recoverOrderState } from './orderState'

describe('recoverOrderState', () => {
  it('CAS 失败后先刷新列表，再获取订单最新详情', async () => {
    const events = []
    const loadOrders = vi.fn(async () => events.push('list'))
    const getOrder = vi.fn(async () => {
      events.push('detail')
      return { id: 9, status: 3 }
    })

    await expect(recoverOrderState(9, { loadOrders, getOrder })).resolves.toEqual({
      id: 9,
      status: 3,
    })
    expect(events).toEqual(['list', 'detail'])
  })
})
