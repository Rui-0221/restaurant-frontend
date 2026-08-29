import { afterEach, describe, expect, it } from 'vitest'
import request from './index'
import { chatAiOrder, confirmAiOrder } from './aiOrder'

const originalAdapter = request.defaults.adapter

const replyWith =
  (envelope, observe = () => {}) =>
  async (config) => {
    observe(config)
    return {
      data: envelope,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

afterEach(() => {
  request.defaults.adapter = originalAdapter
})

describe('AI 点餐接口', () => {
  it('保留业务失败信封中的 MANUAL_ORDER 安全响应', async () => {
    let sentConfig
    request.defaults.adapter = replyWith(
      {
        code: 0,
        msg: '模型超时，请手动点餐',
        data: {
          action: 'MANUAL_ORDER',
          reply: '模型超时，请手动点餐',
          items: [],
          errorCode: 'AI_UNAVAILABLE',
        },
      },
      (config) => {
        sentConfig = config
      },
    )

    const result = await chatAiOrder({ tableId: 1, message: '我对花生过敏，推荐菜品' })

    expect(sentConfig.method).toBe('post')
    expect(sentConfig.url).toBe('/users/ai-order/chat')
    expect(JSON.parse(sentConfig.data)).toEqual({ tableId: 1, message: '我对花生过敏，推荐菜品' })
    expect(result).toMatchObject({ action: 'MANUAL_ORDER', errorCode: 'AI_UNAVAILABLE', items: [] })
  })

  it('确认经过后端校验的推荐方案', async () => {
    let sentConfig
    request.defaults.adapter = replyWith(
      {
        code: 1,
        msg: 'success',
        data: { proposalId: 'proposal-1', order: { id: 88 }, idempotentReplay: false },
      },
      (config) => {
        sentConfig = config
      },
    )

    const payload = { tableId: 1, conversationId: 'conversation-1', proposalId: 'proposal-1' }
    const result = await confirmAiOrder(payload)

    expect(sentConfig.method).toBe('post')
    expect(sentConfig.url).toBe('/users/ai-order/confirm')
    expect(JSON.parse(sentConfig.data)).toEqual(payload)
    expect(result.order.id).toBe(88)
  })
})
