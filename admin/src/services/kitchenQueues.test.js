import { describe, expect, it } from 'vitest'
import { buildKitchenQueues } from './kitchenQueues'

describe('buildKitchenQueues', () => {
  it('只展示待制作和制作中订单，并按下单时间排列', () => {
    const queues = buildKitchenQueues([
      { id: 1, status: 2, createTime: '2026-01-01T10:03:00' },
      { id: 2, status: 1, createTime: '2026-01-01T10:02:00' },
      { id: 3, status: 1, createTime: '2026-01-01T10:01:00' },
      { id: 4, status: 3, createTime: '2026-01-01T10:00:00' },
    ])

    expect(queues.pending.map((order) => order.id)).toEqual([3, 2])
    expect(queues.cooking.map((order) => order.id)).toEqual([1])
  })
})
