<template>
  <main id="main-content" class="ai-page" tabindex="-1" aria-labelledby="ai-order-title">
    <CustomerNavBar title="AI 帮我点" back-label="返回菜单" @back="goMenu">
      <template #right>
        <span class="table-badge">桌号 {{ tableId }}</span>
      </template>
    </CustomerNavBar>

    <header class="ai-hero">
      <div class="ai-mark" aria-hidden="true">AI</div>
      <div>
        <p class="eyebrow">SMART ORDER · 智能点餐</p>
        <h1 id="ai-order-title">说说你今天想吃什么</h1>
        <p>告诉我口味、菜系、人数或忌口，我会依据本店菜品手册为你搭配。</p>
      </div>
    </header>

    <section class="safety-note" aria-label="AI 点餐提示">
      <span aria-hidden="true">!</span>
      <p><strong>过敏信息请明确说明并仔细核对。</strong>AI 可能出错，确认前请检查每道菜。</p>
    </section>

    <section class="quick-section" aria-labelledby="quick-title">
      <h2 id="quick-title">可以这样问</h2>
      <div class="quick-list">
        <button
          v-for="prompt in quickPrompts"
          :key="prompt"
          type="button"
          :disabled="sending || !ready"
          @click="sendPrompt(prompt)"
        >
          {{ prompt }}
        </button>
      </div>
    </section>

    <section class="conversation" aria-label="AI 点餐对话" aria-live="polite">
      <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
        <span class="speaker">{{ message.role === 'user' ? '你' : '点餐助手' }}</span>
        <div class="bubble">
          <p>{{ message.text }}</p>

          <template v-if="message.action === 'PROPOSAL'">
            <div class="source-row">
              <span>AI 推荐</span>
              <span>推荐预览 · 尚未下单</span>
            </div>
            <ul class="proposal-list">
              <li v-for="item in message.items" :key="item.dishId">
                <div>
                  <strong>{{ item.name }}</strong>
                  <span>×{{ item.amount }}</span>
                </div>
                <p>{{ item.reason }}</p>
                <MoneyText :amount="item.price" />
              </li>
            </ul>
            <div class="proposal-total">
              <span>本次推荐合计</span>
              <MoneyText :amount="message.totalAmount" />
            </div>
          </template>

          <div v-if="message.action === 'MANUAL_ORDER'" class="failure-actions">
            <span>{{ errorLabel(message.errorCode) }}</span>
            <a data-testid="manual-order" :href="`#${menuPath}`">返回菜单手动点餐</a>
          </div>
        </div>
      </article>

      <p v-if="sending" class="thinking" role="status">正在阅读菜品手册并为你搭配…</p>
      <div
        ref="conversationEnd"
        class="conversation-end"
        data-testid="conversation-end"
        aria-hidden="true"
      />
    </section>

    <section v-if="currentProposal" class="confirm-card card" aria-labelledby="confirm-title">
      <div>
        <p class="eyebrow">READY TO ADD</p>
        <h2 id="confirm-title">推荐菜品已准备好</h2>
        <p>加入购物车后，可和手动选择的菜品一起调整、确认下单。</p>
      </div>
      <button
        type="button"
        class="confirm-button"
        data-testid="add-recommendation"
        :disabled="sending || !ready"
        @click="addRecommendation"
      >
        加入购物车
      </button>
    </section>

    <p v-if="confirmError" class="confirm-error" role="alert">{{ confirmError }}</p>
    <aside class="cart-notice">
      <a :href="`#${cartPath}`">查看购物车</a
      ><button type="button" data-testid="restart-ai" @click="restart">重新开始</button>
    </aside>

    <form class="composer" @submit.prevent="sendMessage">
      <label for="ai-order-message">描述你的口味或直接让我推荐</label>
      <div class="composer-row">
        <textarea
          id="ai-order-message"
          v-model="draft"
          name="aiOrderMessage"
          rows="2"
          maxlength="500"
          :disabled="sending || !ready"
          placeholder="例如：两个人，想吃清淡不辣的菜…"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          @keydown="handleComposerKeydown"
        />
        <button type="submit" :disabled="!draft.trim() || sending || !ready">
          {{ sending ? '发送中' : '发送' }}
        </button>
      </div>
      <span class="counter">{{ draft.length }}/500</span>
    </form>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { chatAiOrder, cancelAiOrder, getAiOrderMeal } from '../api/aiOrder'
import { useCartStore } from '../store/cart'
import { getUser } from '../utils/storage'
import { createRequestId } from '../utils/requestId'
import {
  loadAiOrderSession,
  saveAiOrderSession,
  clearAiOrderSession,
} from '../utils/aiOrderSession'
import { tableMenuPath, tableCartPath } from '../router/tableRoutes'
import CustomerNavBar from '../components/CustomerNavBar.vue'
import MoneyText from '../components/MoneyText.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const tableId = Number(route.params.tableId)
const userId = computed(() => getUser()?.id)
const menuPath = tableMenuPath(tableId)
const cartPath = tableCartPath(tableId)
const quickPrompts = ['推荐几道招牌菜', '两个人，想吃清淡不辣的菜', '我对花生过敏，帮我推荐']
const messages = ref([])
const draft = ref('')
const conversationId = ref(null)
const currentProposal = ref(null)
const sending = ref(false)
const confirmError = ref('')
const conversationEnd = ref(null)
const isComposing = ref(false)
let messageSequence = 0
let activeRequest = null
let disposed = false
const ready = ref(false)
let mealVersion = null
const readMealVersion = () => getAiOrderMeal(tableId)

const persist = () =>
  saveAiOrderSession(userId.value, tableId, {
    conversationId: conversationId.value,
    messages: messages.value,
    proposal: currentProposal.value,
    mealVersion,
  })
const scrollToLatestMessage = async (behavior = 'smooth') => {
  await nextTick()
  conversationEnd.value?.scrollIntoView?.({ behavior, block: 'end' })
}
const appendMessage = (message) => {
  messages.value.push({ id: `${Date.now()}-${++messageSequence}`, ...message })
  void scrollToLatestMessage()
}
const cancelPending = () => {
  const pending = activeRequest
  if (!pending) return
  activeRequest = null
  pending.controller.abort()
  sending.value = false
  void cancelAiOrder(pending.id).catch(() => {})
}
const restart = () => {
  cancelPending()
  conversationId.value = null
  currentProposal.value = null
  messages.value = []
  confirmError.value = ''
  clearAiOrderSession()
}
onMounted(async () => {
  window.addEventListener('pagehide', cancelPending)
  cartStore.hydrateForTable(tableId)
  try {
    mealVersion = await readMealVersion()
    if (disposed) return
    const stored = loadAiOrderSession(userId.value, tableId)
    if (stored?.mealVersion === mealVersion) {
      messages.value = stored.messages
      conversationId.value = stored.conversationId || null
      currentProposal.value = stored.proposal || null
      void scrollToLatestMessage('auto')
    } else {
      clearAiOrderSession()
    }
    ready.value = true
  } catch {
    confirmError.value = '桌台状态暂时不可用，请返回菜单重试。'
  }
})
onBeforeUnmount(() => {
  disposed = true
  cancelPending()
  window.removeEventListener('pagehide', cancelPending)
})

const sendPrompt = async (prompt) => {
  draft.value = prompt
  await sendMessage()
}
const handleCompositionStart = () => {
  isComposing.value = true
}
const handleCompositionEnd = () => {
  isComposing.value = false
}
const handleComposerKeydown = (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || isComposing.value) return
  event.preventDefault()
  void sendMessage()
}
const sendMessage = async () => {
  const text = draft.value.trim()
  if (!text || sending.value || disposed || !ready.value) return
  const pending = { id: createRequestId(), controller: new AbortController() }
  activeRequest = pending
  draft.value = ''
  currentProposal.value = null
  confirmError.value = ''
  appendMessage({ role: 'user', text })
  sending.value = true
  persist()
  try {
    const payload = { tableId, message: text, requestId: pending.id }
    if (conversationId.value) payload.conversationId = conversationId.value
    const response = await chatAiOrder(payload, { signal: pending.controller.signal })
    if (disposed || activeRequest !== pending) return
    if (response.errorCode === 'CANCELLED') return
    if (response.errorCode === 'CONVERSATION_NOT_FOUND') {
      conversationId.value = null
      messages.value = messages.value.slice(-1)
    } else {
      conversationId.value = response.conversationId || conversationId.value
    }
    appendMessage({
      role: 'assistant',
      text: response.reply,
      action: response.action,
      items: response.items || [],
      totalAmount: response.totalAmount,
      errorCode: response.errorCode,
    })
    if (response.action === 'PROPOSAL' && response.items?.length) currentProposal.value = response
  } catch (error) {
    if (disposed || activeRequest !== pending || pending.controller.signal.aborted) return
    // 超时或网络断开也停止服务端生成，避免留下无接收者的请求。
    void cancelAiOrder(pending.id).catch(() => {})
    appendMessage({
      role: 'assistant',
      text: error?.message || 'AI 请求失败，请重试。',
      action: 'MANUAL_ORDER',
      items: [],
      errorCode: 'AI_UNAVAILABLE',
    })
  } finally {
    if (!disposed && activeRequest === pending) {
      activeRequest = null
      sending.value = false
      persist()
    }
  }
}
const addRecommendation = async () => {
  if (!currentProposal.value || sending.value || !ready.value) return
  confirmError.value = ''
  const recommendation = currentProposal.value
  ready.value = false
  try {
    const currentMeal = await readMealVersion()
    if (currentProposal.value !== recommendation) return
    if (disposed) return
    if (currentMeal !== mealVersion) {
      restart()
      mealVersion = currentMeal
      confirmError.value = '已开始新的用餐，请重新描述需求。'
      return
    }
    const result = cartStore.addItems(
      recommendation.items.map((item) => ({
        dish: { id: item.dishId, name: item.name, price: Number(item.price) },
        amount: item.amount,
      })),
    )
    if (!result.ok) {
      confirmError.value = result.message
      return
    }
    currentProposal.value = null
    persist()
    showSuccessToast('已加入购物车，可继续调整后下单')
  } catch {
    confirmError.value = '桌台状态暂时不可用，请稍后重试。'
  } finally {
    if (!disposed) ready.value = true
  }
}
const errorLabel = (code) => (code === 'RATE_LIMITED' ? '稍后再试' : '可以继续描述需求或手动选菜')
const goMenu = () => router.push(menuPath)
</script>

<style scoped>
.ai-page {
  min-height: 100dvh;
  padding-bottom: calc(132px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.table-badge {
  padding: 5px 10px;
  border-radius: var(--radius-xl);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 11px;
  font-weight: 800;
}

.ai-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 23px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    radial-gradient(circle at 88% 12%, rgb(229 77 46 / 12%), transparent 12rem), var(--surface);
}

.ai-mark {
  display: grid;
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(145deg, var(--brand-dark), var(--brand-active));
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
  box-shadow: 0 10px 24px rgb(201 61 32 / 22%);
  place-items: center;
}

.eyebrow {
  color: var(--brand-dark);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.ai-hero h1 {
  margin-top: 5px;
  font-size: 22px;
  line-height: 1.3;
}

.ai-hero p:last-child {
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.55;
}

.safety-note {
  display: flex;
  gap: 10px;
  margin: 12px;
  padding: 12px 14px;
  border: 1px solid rgb(148 89 21 / 20%);
  border-radius: var(--radius-md);
  background: rgb(255 246 229 / 78%);
  color: var(--status-warning);
  font-size: 11px;
  line-height: 1.5;
}

.safety-note > span {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(148 89 21 / 12%);
  font-weight: 900;
  place-items: center;
}

.quick-section {
  padding: 3px 12px 8px;
}

.quick-section h2 {
  color: var(--text-sub);
  font-size: 11px;
}

.quick-list {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-bottom: 4px;
  overflow-x: auto;
}

.quick-list button {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid rgb(229 77 46 / 18%);
  border-radius: var(--radius-xl);
  background: var(--surface);
  color: var(--brand-dark);
  font-size: 12px;
}

.conversation {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 92%;
}

.message.user {
  align-self: flex-end;
  align-items: flex-end;
}

.speaker {
  margin: 0 6px 4px;
  color: var(--text-muted);
  font-size: 10px;
}

.bubble {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 5px var(--radius-lg) var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  font-size: 13px;
  line-height: 1.6;
}

.user .bubble {
  border: 0;
  border-radius: var(--radius-lg) 5px var(--radius-lg) var(--radius-lg);
  background: linear-gradient(145deg, var(--brand-dark), var(--brand-active));
  color: #fff;
}

.source-row,
.proposal-total {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 10px;
}

.proposal-list {
  margin-top: 8px;
  list-style: none;
}

.proposal-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 12px;
  padding: 11px 0;
  border-top: 1px solid var(--border-subtle);
}

.proposal-list li div {
  display: flex;
  gap: 7px;
}

.proposal-list li div span,
.proposal-list li p {
  color: var(--text-sub);
  font-size: 11px;
}

.proposal-list li p {
  grid-column: 1;
}

.proposal-list :deep(.money-text) {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  color: var(--brand-dark);
  font-weight: 800;
}

.proposal-total {
  align-items: center;
  padding-top: 11px;
  border-top: 1px dashed var(--border-subtle);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 800;
}

.proposal-total :deep(.money-text) {
  color: var(--brand-dark);
  font-size: 18px;
}

.failure-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  color: var(--status-danger);
  font-size: 11px;
}

.failure-actions a,
.cart-notice a {
  color: var(--brand-dark);
  font-weight: 800;
}

.thinking {
  color: var(--text-sub);
  font-size: 12px;
}

.conversation-end {
  width: 100%;
  height: 1px;
  scroll-margin-bottom: calc(116px + env(safe-area-inset-bottom));
  pointer-events: none;
}

.confirm-card {
  margin: 4px 12px 12px;
  padding: 17px;
  border-left: 4px solid var(--brand-color);
}

.confirm-card h2 {
  margin-top: 3px;
  font-size: 17px;
}

.confirm-card > div > p:last-child {
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 11px;
}

.confirm-button {
  width: 100%;
  min-height: 48px;
  margin-top: 14px;
  border: 0;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--brand-dark), var(--brand-active));
  color: #fff;
  font-weight: 800;
}

.confirm-button:disabled,
.quick-list button:disabled,
.composer button:disabled {
  opacity: 0.55;
}

.confirm-error {
  margin-top: 10px;
  color: var(--status-danger);
  font-size: 12px;
}

.cart-notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 12px 12px;
  padding: 11px 13px;
  border-radius: var(--radius-md);
  background: rgb(47 105 172 / 8%);
  color: var(--status-info);
  font-size: 11px;
  line-height: 1.5;
}

.composer {
  position: fixed;
  right: auto;
  bottom: 0;
  left: 50%;
  z-index: 20;
  width: min(100%, var(--content-max));
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-subtle);
  background: rgb(255 253 250 / 96%);
  box-shadow: 0 -10px 30px rgb(87 58 39 / 9%);
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}

.composer > label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-sub);
  font-size: 10px;
}

.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.composer textarea {
  flex: 1;
  min-height: 54px;
  max-height: 110px;
  padding: 9px 11px;
  resize: vertical;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-strong);
  color: var(--text-main);
  line-height: 1.45;
}

.composer button {
  flex: 0 0 64px;
  min-height: 46px;
  border: 0;
  border-radius: var(--radius-xl);
  background: var(--brand-dark);
  color: #fff;
  font-weight: 800;
}

.counter {
  display: block;
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 9px;
  text-align: right;
}
</style>
