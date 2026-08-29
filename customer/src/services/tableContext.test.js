import { describe, expect, it, vi } from 'vitest'
import { synchronizeTableContext } from './tableContext'

const createStore = () => ({
  tableId: null,
  mode: 'new',
  activeOrder: null,
  hydrateForTable: vi.fn(),
  setContext: vi.fn(),
})

describe('synchronizeTableContext', () => {
  it('hydrates the cart and switches to add mode for the latest active order', async () => {
    const cartStore = createStore()
    const activeOrder = { id: 8, tableId: 1, status: 4 }
    const getActiveOrder = vi.fn().mockResolvedValue(activeOrder)

    await expect(synchronizeTableContext(1, { cartStore, getActiveOrder })).resolves.toEqual({
      tableId: '1',
      activeOrder,
      error: null,
    })
    expect(cartStore.hydrateForTable).toHaveBeenCalledWith('1')
    expect(cartStore.setContext).toHaveBeenCalledWith('1', 'add', activeOrder)
  })

  it('switches to new mode when the table has no active order', async () => {
    const cartStore = createStore()

    await expect(
      synchronizeTableContext('001', {
        cartStore,
        getActiveOrder: vi.fn().mockResolvedValue(null),
      }),
    ).resolves.toEqual({ tableId: '1', activeOrder: null, error: null })
    expect(cartStore.hydrateForTable).toHaveBeenCalledWith('1')
    expect(cartStore.setContext).toHaveBeenCalledWith('1', 'new', null)
  })

  it('keeps the hydrated cart and returns an error when context lookup fails', async () => {
    const cartStore = createStore()
    const error = new Error('network')
    const getActiveOrder = vi.fn().mockRejectedValue(error)

    await expect(synchronizeTableContext(1, { cartStore, getActiveOrder })).resolves.toEqual({
      tableId: '1',
      activeOrder: null,
      error,
    })
    expect(cartStore.hydrateForTable).toHaveBeenCalledWith('1')
    expect(cartStore.setContext).not.toHaveBeenCalled()
  })

  it('rejects an invalid table id without calling the store or API', async () => {
    const cartStore = createStore()
    const getActiveOrder = vi.fn()

    await expect(synchronizeTableContext('abc', { cartStore, getActiveOrder })).resolves.toEqual({
      tableId: null,
      activeOrder: null,
      error: null,
    })
    expect(cartStore.hydrateForTable).not.toHaveBeenCalled()
    expect(getActiveOrder).not.toHaveBeenCalled()
  })
})
