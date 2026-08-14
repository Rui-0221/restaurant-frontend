import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyOrders, getTableActiveOrder } from '../api/order'
import { recoverOrderById } from './orderRecovery'

vi.mock('../api/order', () => ({ getMyOrders: vi.fn(), getTableActiveOrder: vi.fn() }))

describe('recoverOrderById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('从当前用户历史订单恢复路由对应的订单', async () => {
    getMyOrders.mockResolvedValue([{ id: 3 }, { id: 7 }])
    await expect(recoverOrderById('7')).resolves.toEqual({ id: 7 })
    expect(getTableActiveOrder).not.toHaveBeenCalled()
  })

  it('仅在活跃订单 ID 与路由一致时使用桌台兜底', async () => {
    getMyOrders.mockResolvedValue([])
    getTableActiveOrder.mockResolvedValue({ id: 8 })
    await expect(recoverOrderById(8, 1)).resolves.toEqual({ id: 8 })
    getTableActiveOrder.mockResolvedValue({ id: 9 })
    await expect(recoverOrderById(8, 1)).resolves.toBeNull()
  })
})
