import { describe, expect, it, vi } from 'vitest'
import { createKitchenLifecycle } from './kitchenLifecycle'

describe('kitchen lifecycle', () => {
  it('卸载时释放轮询、时钟和重连定时器，并关闭 WebSocket', () => {
    const timer = {
      setInterval: vi.fn().mockReturnValueOnce('clock').mockReturnValueOnce('poll'),
      clearInterval: vi.fn(),
      setTimeout: vi.fn().mockReturnValue('reconnect'),
      clearTimeout: vi.fn(),
    }
    const lifecycle = createKitchenLifecycle(timer)
    const ws = { close: vi.fn() }

    lifecycle.start(vi.fn(), vi.fn())
    lifecycle.scheduleReconnect(vi.fn())
    lifecycle.dispose(ws)

    expect(timer.clearInterval).toHaveBeenCalledWith('clock')
    expect(timer.clearInterval).toHaveBeenCalledWith('poll')
    expect(timer.clearTimeout).toHaveBeenCalledWith('reconnect')
    expect(ws.close).toHaveBeenCalledOnce()
  })
})
