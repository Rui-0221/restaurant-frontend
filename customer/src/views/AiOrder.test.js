import { createPinia, setActivePinia } from 'pinia'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiOrder from './AiOrder.vue'
import { useCartStore } from '../store/cart'
import { loadAiOrderSession } from '../utils/aiOrderSession'
enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  cancel: vi.fn(),
  getTable: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}))

vi.mock('../api/aiOrder', () => ({
  chatAiOrder: mocks.chat,
  cancelAiOrder: mocks.cancel,
  getAiOrderMeal: mocks.getTable,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { tableId: '1' } }),
  useRouter: () => ({ replace: mocks.replace, push: mocks.push, back: vi.fn() }),
}))

const mountPage = () =>
  shallowMount(AiOrder, {
    global: {
      stubs: {
        CustomerNavBar: { template: '<div><slot /><slot name="right" /></div>' },
        MoneyText: { props: ['amount'], template: '<span class="money-stub">{{ amount }}</span>' },
      },
    },
  })

const proposal = {
  action: 'PROPOSAL',
  reply: '为您选了两道清淡菜，请确认。',
  source: 'DEEPSEEK',
  conversationId: 'conversation-1',
  proposalId: 'proposal-1',
  totalAmount: 48,
  items: [
    { dishId: 2, name: '清蒸鲈鱼', amount: 1, price: 38, reason: '清淡鲜香' },
    { dishId: 3, name: '时蔬', amount: 1, price: 10, reason: '少油清爽' },
  ],
}

describe('顾客 AI 点餐页', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.resetAllMocks()
    mocks.getTable.mockResolvedValue(1)
    mocks.cancel.mockResolvedValue({ ok: true })
    const cart = useCartStore()
    cart.setContext(1, 'new')
  })

  it('根据顾客描述展示推荐预览，但不会自动下单', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('想吃清淡不辣的菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.chat).toHaveBeenCalledWith(
      { tableId: 1, message: '想吃清淡不辣的菜', requestId: expect.any(String) },
      { signal: expect.any(AbortSignal) },
    )
    expect(wrapper.text()).toContain('清蒸鲈鱼')
    expect(wrapper.text()).toContain('清淡鲜香')
    expect(wrapper.text()).toContain('加入购物车')
    expect(useCartStore().list).toEqual([])
  })

  it('追加顾客和助手消息后会自动滚动到最新消息', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    const scrollIntoView = vi.fn()
    wrapper.get('[data-testid="conversation-end"]').element.scrollIntoView = scrollIntoView

    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('想吃清淡不辣的菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(scrollIntoView).toHaveBeenCalled()
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'end' })
  })

  it('在输入框按 Enter 会发送消息', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    const textarea = wrapper.get('textarea[name="aiOrderMessage"]')
    await textarea.setValue('推荐招牌菜')

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    textarea.element.dispatchEvent(enterEvent)
    await flushPromises()

    expect(enterEvent.defaultPrevented).toBe(true)
    expect(mocks.chat).toHaveBeenCalledWith(
      { tableId: 1, message: '推荐招牌菜', requestId: expect.any(String) },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('按 Shift+Enter 会保留浏览器换行行为且不会发送', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const textarea = wrapper.get('textarea[name="aiOrderMessage"]')
    await textarea.setValue('第一行')

    const shiftEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    textarea.element.dispatchEvent(shiftEnterEvent)
    await flushPromises()

    expect(shiftEnterEvent.defaultPrevented).toBe(false)
    expect(mocks.chat).not.toHaveBeenCalled()
  })

  it('中文输入法组词期间按 Enter 只确认候选词而不会发送', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    const textarea = wrapper.get('textarea[name="aiOrderMessage"]')
    await textarea.setValue('想吃清淡的')
    await textarea.trigger('compositionstart')

    const composingEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    textarea.element.dispatchEvent(composingEnterEvent)
    await flushPromises()

    expect(composingEnterEvent.defaultPrevented).toBe(false)
    expect(mocks.chat).not.toHaveBeenCalled()

    await textarea.trigger('compositionend')
    const sendEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    textarea.element.dispatchEvent(sendEnterEvent)
    await flushPromises()

    expect(mocks.chat).toHaveBeenCalledWith(
      { tableId: 1, message: '想吃清淡的', requestId: expect.any(String) },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('空白内容按 Enter 不会发送请求', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const textarea = wrapper.get('textarea[name="aiOrderMessage"]')
    await textarea.setValue('   ')

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    textarea.element.dispatchEvent(enterEvent)
    await flushPromises()

    expect(enterEvent.defaultPrevented).toBe(true)
    expect(mocks.chat).not.toHaveBeenCalled()
  })

  it('发送进行中连续按 Enter 不会重复提交', async () => {
    let resolveChat
    mocks.chat.mockImplementation(() => new Promise((resolve) => (resolveChat = resolve)))
    const wrapper = mountPage()
    await flushPromises()
    const textarea = wrapper.get('textarea[name="aiOrderMessage"]')
    await textarea.setValue('推荐招牌菜')

    const dispatchEnter = () =>
      textarea.element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    dispatchEnter()
    dispatchEnter()

    expect(mocks.chat).toHaveBeenCalledTimes(1)

    resolveChat(proposal)
    await flushPromises()
  })

  it('模型失败时只提供重试或手动点餐，不展示确认按钮', async () => {
    mocks.chat.mockResolvedValue({
      action: 'MANUAL_ORDER',
      reply: '模型超时，请手动点餐',
      items: [],
      errorCode: 'AI_UNAVAILABLE',
      conversationId: 'conversation-1',
    })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('我对花生过敏，请推荐')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('模型超时，请手动点餐')
    expect(wrapper.find('[data-testid="add-recommendation"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="manual-order"]').attributes('href')).toBe('#/table/1/menu')
  })

  it('推荐只在点击后合并到普通购物车，保留手动菜品且不重复添加', async () => {
    const cart = useCartStore()
    cart.setItemAmount({ id: 2, name: '手动鲈鱼', price: 38 }, 2)
    cart.setItemAmount({ id: 9, name: '宫保鸡丁', price: 20 }, 1)
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea').setValue('推荐清淡菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(Object.keys(mocks.chat.mock.calls[0][0]).sort()).toEqual([
      'message',
      'requestId',
      'tableId',
    ])
    expect(cart.items[2].amount).toBe(2)
    const button = wrapper.get('[data-testid="add-recommendation"]')
    await button.trigger('click')
    await button.trigger('click')
    await flushPromises()
    expect(cart.items[2]).toMatchObject({ amount: 3, dish: { name: '手动鲈鱼' } })
    expect(cart.items[9].amount).toBe(1)
    expect(cart.items[3].amount).toBe(1)
    expect(cart.activeOrder).toBeNull()
    expect(wrapper.find('[data-testid="add-recommendation"]').exists()).toBe(false)
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('离开页面中止请求并取消后台生成，迟到回复不写入会话或购物车', async () => {
    let resolveChat
    mocks.chat.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve
        }),
    )
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea').setValue('推荐')
    await wrapper.get('form').trigger('submit')
    const [payload, options] = mocks.chat.mock.calls[0]
    wrapper.unmount()
    expect(options.signal.aborted).toBe(true)
    expect(mocks.cancel).toHaveBeenCalledWith(payload.requestId)
    resolveChat(proposal)
    await flushPromises()
    expect(useCartStore().list).toEqual([])
    expect(loadAiOrderSession(undefined, 1).messages).toHaveLength(1)
  })

  it('重新开始会取消旧请求，旧结果不能覆盖新对话', async () => {
    let resolveOld
    mocks.chat.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    mocks.chat.mockResolvedValueOnce({
      action: 'ASK_CLARIFICATION',
      reply: '请问几位？',
      items: [],
      conversationId: 'new',
    })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea').setValue('旧需求')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-testid="restart-ai"]').trigger('click')
    await wrapper.get('textarea').setValue('新需求')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    resolveOld(proposal)
    await flushPromises()
    expect(wrapper.text()).toContain('请问几位')
    expect(wrapper.text()).not.toContain('清蒸鲈鱼')
    expect(mocks.cancel).toHaveBeenCalledTimes(1)
  })

  it('pagehide 时取消正在进行的请求', async () => {
    mocks.chat.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea').setValue('推荐')
    await wrapper.get('form').trigger('submit')
    window.dispatchEvent(new Event('pagehide'))
    expect(mocks.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.chat.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('加入前发现已经换餐时清除推荐，不改动手动购物车', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('textarea').setValue('推荐')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    mocks.getTable.mockResolvedValue(3)
    await wrapper.get('[data-testid="add-recommendation"]').trigger('click')
    await flushPromises()
    expect(useCartStore().list).toEqual([])
    expect(wrapper.find('[data-testid="add-recommendation"]').exists()).toBe(false)
  })
})
