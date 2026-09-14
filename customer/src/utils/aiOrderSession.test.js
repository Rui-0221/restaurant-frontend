import { beforeEach, describe, expect, it } from 'vitest'
import { clearAiOrderSession, loadAiOrderSession, saveAiOrderSession } from './aiOrderSession'

describe('AI 点餐会话存储', () => {
  beforeEach(() => sessionStorage.clear())

  it('只恢复同一顾客同一桌台的对话', () => {
    const session = {
      conversationId: 'conversation-1',
      messages: [{ role: 'user', text: '想吃清淡的' }],
      proposal: null,
    }
    saveAiOrderSession(7, 3, session)

    expect(loadAiOrderSession(7, 3)).toEqual(session)
  })

  it('切换桌台或顾客时清除旧会话', () => {
    saveAiOrderSession(7, 3, { conversationId: 'conversation-1', messages: [], proposal: null })

    expect(loadAiOrderSession(7, 4)).toBeNull()
    expect(loadAiOrderSession(7, 3)).toBeNull()
  })

  it('显式清除会话且忽略损坏的数据', () => {
    sessionStorage.setItem('customer_ai_order_session_v2', '{broken')
    expect(loadAiOrderSession(7, 3)).toBeNull()

    saveAiOrderSession(7, 3, { conversationId: null, messages: [], proposal: null })
    clearAiOrderSession()
    expect(loadAiOrderSession(7, 3)).toBeNull()
  })
})
