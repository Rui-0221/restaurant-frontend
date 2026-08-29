import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiOrder from './AiOrder.vue'
import { useCartStore } from '../store/cart'

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  confirm: vi.fn(),
  synchronize: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}))

vi.mock('../api/aiOrder', () => ({
  chatAiOrder: mocks.chat,
  confirmAiOrder: mocks.confirm,
}))

vi.mock('../services/tableContext', () => ({
  synchronizeTableContext: mocks.synchronize,
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
    vi.clearAllMocks()
    mocks.synchronize.mockResolvedValue({ error: null })
    const cart = useCartStore()
    cart.setContext(1, 'new')
  })

  it('根据顾客描述展示推荐预览，但不会自动下单', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('想吃清淡不辣的菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.chat).toHaveBeenCalledWith({ tableId: 1, message: '想吃清淡不辣的菜' })
    expect(wrapper.text()).toContain('清蒸鲈鱼')
    expect(wrapper.text()).toContain('清淡鲜香')
    expect(wrapper.text()).toContain('确认并下单')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('在输入框按 Enter 会发送消息', async () => {
    mocks.chat.mockResolvedValue(proposal)
    const wrapper = mountPage()
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
    expect(mocks.chat).toHaveBeenCalledWith({ tableId: 1, message: '推荐招牌菜' })
  })

  it('按 Shift+Enter 会保留浏览器换行行为且不会发送', async () => {
    const wrapper = mountPage()
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

    expect(mocks.chat).toHaveBeenCalledWith({ tableId: 1, message: '想吃清淡的' })
  })

  it('空白内容按 Enter 不会发送请求', async () => {
    const wrapper = mountPage()
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
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('我对花生过敏，请推荐')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('模型超时，请手动点餐')
    expect(wrapper.find('[data-testid="confirm-proposal"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="manual-order"]').attributes('href')).toBe('#/table/1/menu')
  })

  it('显式确认后更新订单上下文并进入订单详情', async () => {
    mocks.chat.mockResolvedValue(proposal)
    mocks.confirm.mockResolvedValue({
      proposalId: 'proposal-1',
      order: { id: 88, tableId: 1, status: 1, details: [] },
      idempotentReplay: false,
    })
    const wrapper = mountPage()
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('推荐招牌菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('[data-testid="confirm-proposal"]').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledWith({
      tableId: 1,
      conversationId: 'conversation-1',
      proposalId: 'proposal-1',
    })
    expect(useCartStore().activeOrder.id).toBe(88)
    expect(mocks.replace).toHaveBeenCalledWith('/order-detail/88')
  })

  it('确认进行中拒绝重复提交', async () => {
    let resolveConfirm
    mocks.chat.mockResolvedValue(proposal)
    mocks.confirm.mockImplementation(() => new Promise((resolve) => (resolveConfirm = resolve)))
    const wrapper = mountPage()
    await wrapper.get('textarea[name="aiOrderMessage"]').setValue('推荐招牌菜')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const button = wrapper.get('[data-testid="confirm-proposal"]')
    await button.trigger('click')
    await button.trigger('click')
    expect(mocks.confirm).toHaveBeenCalledTimes(1)

    resolveConfirm({ order: { id: 88, tableId: 1, status: 1 }, idempotentReplay: true })
    await flushPromises()
  })
})
