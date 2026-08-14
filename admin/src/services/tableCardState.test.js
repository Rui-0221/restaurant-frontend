import { describe, expect, it } from 'vitest'
import { describeTableCard } from './tableCardState'

describe('describeTableCard', () => {
  it('展示占用桌的真实活跃订单及阶段', () => {
    expect(describeTableCard({ status: 1 }, { id: 18, status: 2 })).toEqual({
      kind: 'active',
      title: '活跃订单 #18',
      detail: '制作中',
    })
  })

  it('标记桌台状态与订单状态不一致的两种情况', () => {
    expect(describeTableCard({ status: 1 }, null)).toEqual({
      kind: 'warning',
      title: '异常占用',
      detail: '未查询到活跃订单',
    })
    expect(describeTableCard({ status: 0 }, { id: 9, status: 1 })).toEqual({
      kind: 'warning',
      title: '状态待同步',
      detail: '活跃订单 #9',
    })
  })

  it('展示空闲桌台的可点餐状态', () => {
    expect(describeTableCard({ status: 0 }, null)).toEqual({
      kind: 'idle',
      title: '当前空闲',
      detail: '可直接开始点餐',
    })
  })
})
