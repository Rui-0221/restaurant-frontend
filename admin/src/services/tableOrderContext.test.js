import { describe, expect, it } from 'vitest'
import { resolveTableOrderContext } from './tableOrderContext'

describe('resolveTableOrderContext', () => {
  it('以活跃订单而不是桌台状态判断追加模式', () => {
    expect(resolveTableOrderContext({ status: 1 }, { id: 12 })).toMatchObject({ kind: 'busy' })
  })

  it('允许异常占用桌台创建新订单', () => {
    expect(resolveTableOrderContext({ status: 1 }, null)).toMatchObject({ kind: 'warning' })
  })

  it('阻止空闲桌台却存在活跃订单的状态不一致', () => {
    expect(resolveTableOrderContext({ status: 0 }, { id: 12 })).toMatchObject({ kind: 'inconsistent' })
  })

  it('将空闲且无订单的桌台识别为首次点餐', () => {
    expect(resolveTableOrderContext({ status: 0 }, null)).toMatchObject({ kind: 'free' })
  })
})
