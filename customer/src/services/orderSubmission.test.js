import { describe, expect, it, vi } from 'vitest'
import { submitOrderWithRecovery, TERMINAL_ORDER_CONFLICT } from './orderSubmission'

const items = [
  { dishId: 1, amount: 2 },
  { dishId: 5, amount: 1 },
]

const submit = (overrides = {}) =>
  submitOrderWithRecovery({
    tableId: '1',
    mode: 'add',
    activeOrder: { id: 10, tableId: 1, status: 4 },
    items,
    scanOrder: vi.fn().mockResolvedValue({ id: 11, tableId: 1 }),
    getActiveOrder: vi.fn().mockResolvedValue(null),
    confirmRecovery: vi.fn().mockResolvedValue(true),
    ...overrides,
  })

describe('submitOrderWithRecovery', () => {
  it('submits a normal success once and returns the order', async () => {
    const scanOrder = vi.fn().mockResolvedValue({ id: 11 })

    await expect(submit({ scanOrder })).resolves.toMatchObject({
      kind: 'success',
      order: { id: 11 },
    })
    expect(scanOrder).toHaveBeenCalledTimes(1)
  })

  it('does not retry or clear the cart for a non-terminal error', async () => {
    const error = new Error('菜品已下架')
    const scanOrder = vi.fn().mockRejectedValue(error)

    await expect(submit({ scanOrder })).resolves.toMatchObject({ kind: 'error', error })
    expect(scanOrder).toHaveBeenCalledTimes(1)
  })

  it('keeps items and switches to new mode when the user cancels recovery', async () => {
    const scanOrder = vi.fn().mockRejectedValue(new Error(TERMINAL_ORDER_CONFLICT))
    const confirmRecovery = vi.fn().mockResolvedValue(false)

    await expect(submit({ scanOrder, confirmRecovery })).resolves.toMatchObject({
      kind: 'cancelled',
      mode: 'new',
      activeOrder: null,
      items,
    })
    expect(scanOrder).toHaveBeenCalledTimes(1)
  })

  it('retries once with the immutable original snapshot after confirmation', async () => {
    const scanOrder = vi
      .fn()
      .mockRejectedValueOnce(new Error(TERMINAL_ORDER_CONFLICT))
      .mockResolvedValueOnce({ id: 12 })
    const confirmRecovery = vi.fn().mockResolvedValue(true)

    const result = await submit({ scanOrder, confirmRecovery })

    expect(result).toMatchObject({ kind: 'success', retried: true, order: { id: 12 } })
    expect(scanOrder).toHaveBeenCalledTimes(2)
    expect(scanOrder.mock.calls[0][0]).toEqual(scanOrder.mock.calls[1][0])
    expect(scanOrder.mock.calls[0][0].items).toBe(scanOrder.mock.calls[1][0].items)
  })

  it('switches to a newly active order before the single confirmed retry', async () => {
    const nextOrder = { id: 20, tableId: 1, status: 2 }
    const scanOrder = vi
      .fn()
      .mockRejectedValueOnce(new Error(TERMINAL_ORDER_CONFLICT))
      .mockResolvedValueOnce({ id: 21 })
    const confirmRecovery = vi.fn().mockResolvedValue(true)

    const result = await submit({
      scanOrder,
      getActiveOrder: vi.fn().mockResolvedValue(nextOrder),
      confirmRecovery,
    })

    expect(confirmRecovery).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'add', activeOrder: nextOrder, items }),
    )
    expect(result).toMatchObject({ kind: 'success', retried: true })
  })

  it('stops after a second terminal conflict without looping', async () => {
    const scanOrder = vi
      .fn()
      .mockRejectedValueOnce(new Error(TERMINAL_ORDER_CONFLICT))
      .mockRejectedValueOnce(new Error(TERMINAL_ORDER_CONFLICT))
    const confirmRecovery = vi.fn().mockResolvedValue(true)

    await expect(submit({ scanOrder, confirmRecovery })).resolves.toMatchObject({
      kind: 'retry-error',
      items,
    })
    expect(scanOrder).toHaveBeenCalledTimes(2)
    expect(confirmRecovery).toHaveBeenCalledTimes(1)
  })

  it('keeps items when active-order recovery lookup fails', async () => {
    const scanOrder = vi.fn().mockRejectedValue(new Error(TERMINAL_ORDER_CONFLICT))
    const error = new Error('network')

    await expect(
      submit({ scanOrder, getActiveOrder: vi.fn().mockRejectedValue(error) }),
    ).resolves.toMatchObject({ kind: 'recovery-error', error, items })
  })

  it('never submits a second time when recovery confirmation is cancelled', async () => {
    const scanOrder = vi.fn().mockRejectedValue(new Error(TERMINAL_ORDER_CONFLICT))
    const confirmRecovery = vi.fn().mockResolvedValue(false)

    const result = await submit({ scanOrder, confirmRecovery })
    expect(result.kind).toBe('cancelled')
    expect(scanOrder).toHaveBeenCalledTimes(1)
  })
})
