import { afterEach, describe, expect, it, vi } from 'vitest'
import request from './index'
import { chatAiOrder, cancelAiOrder } from './aiOrder'
import { setToken } from '../utils/storage'
const originalAdapter = request.defaults.adapter
afterEach(() => {
  request.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
})
describe('AI 点餐接口', () => {
  it('携带取消信号并保留业务失败中的安全响应', async () => {
    let sent
    request.defaults.adapter = async (config) => {
      sent = config
      return {
        data: {
          code: 0,
          msg: '模型超时',
          data: { action: 'MANUAL_ORDER', items: [], errorCode: 'AI_UNAVAILABLE' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    const signal = new AbortController().signal
    const payload = { tableId: 1, requestId: 'r1', message: '推荐' }
    const result = await chatAiOrder(payload, { signal })
    expect(sent.url).toBe('/users/ai-order/chat')
    expect(JSON.parse(sent.data)).toEqual(payload)
    expect(sent.signal).toBe(signal)
    expect(result).toMatchObject({ action: 'MANUAL_ORDER', errorCode: 'AI_UNAVAILABLE', items: [] })
  })
  it('退出时用带身份的 keepalive 请求通知取消', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)
    setToken('test-token')
    await cancelAiOrder('r1')
    expect(fetch).toHaveBeenCalledWith('/api/users/ai-order/cancel', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ requestId: 'r1' }),
    })
  })
})
