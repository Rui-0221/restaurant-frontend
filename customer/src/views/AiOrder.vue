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
          :disabled="sending || confirming"
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
              <span>{{ sourceLabel(message.source) }}</span>
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
    </section>

    <section v-if="currentProposal" class="confirm-card card" aria-labelledby="confirm-title">
      <div>
        <p class="eyebrow">READY TO ORDER</p>
        <h2 id="confirm-title">推荐方案已准备好</h2>
        <p>
          点击后会{{
            cartStore.mode === 'add' ? '直接追加到当前订单' : '直接创建订单'
          }}，不会先放入购物车。
        </p>
      </div>
      <button
        type="button"
        class="confirm-button"
        data-testid="confirm-proposal"
        :disabled="sending || confirming"
        @click="confirmProposal"
      >
        {{ confirming ? '正在确认…' : confirmLabel }}
      </button>
      <p v-if="confirmError" class="confirm-error" role="alert">{{ confirmError }}</p>
    </section>

    <aside v-if="cartStore.totalCount" class="cart-notice">
      手动购物车中还有 {{ cartStore.totalCount }} 份菜；AI 下单不会清空或合并这些菜品。
      <a :href="`#${cartPath}`">查看购物车</a>
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
          :disabled="sending || confirming"
          placeholder="例如：两个人，想吃清淡不辣的菜…"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          @keydown="handleComposerKeydown"
        />
        <button type="submit" :disabled="!draft.trim() || sending || confirming">
          {{ sending ? '发送中' : '发送' }}
        </button>
      </div>
      <span class="counter">{{ draft.length }}/500</span>
    </form>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { chatAiOrder, confirmAiOrder } from '../api/aiOrder'
import { useCartStore } from '../store/cart'
import { useUserStore } from '../store/user'
import { synchronizeTableContext } from '../services/tableContext'
import {
  clearAiOrderSession,
  loadAiOrderSession,
  saveAiOrderSession,
} from '../utils/aiOrderSession'
import { tableCartPath, tableMenuPath } from '../router/tableRoutes'
import CustomerNavBar from '../components/CustomerNavBar.vue'
import MoneyText from '../components/MoneyText.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
const tableId = Number(route.params.tableId)
const menuPath = tableMenuPath(tableId) || '/'
const cartPath = tableCartPath(tableId) || '/'
const userId = computed(() => userStore.userInfo?.id ?? '')

const quickPrompts = ['推荐本店招牌菜', '想吃清淡不辣的', '推荐一道川菜', '我有过敏或忌口']
const draft = ref('')
const messages = ref([
  {
    id: 'welcome',
    role: 'assistant',
    text: '你好！可以告诉我口味、菜系、人数或过敏信息，也可以直接让我推荐招牌菜。',
  },
])
const conversationId = ref(null)
const currentProposal = ref(null)
const sending = ref(false)
const confirming = ref(false)
const confirmError = ref('')
const isComposing = ref(false)
let messageSequence = 0

const sourceLabels = {
  DIRECT_MATCH: '按菜名精准选择',
  SIGNATURE_RULE: '本店招牌推荐',
  DEEPSEEK: 'AI 口味推荐',
}
const errorLabels = {
  INVALID_REQUEST: '描述无法处理，请换一种说法',
  RATE_LIMITED: '请求较多，请稍后再试',
  STATE_UNAVAILABLE: '会话暂时不可用',
  CONVERSATION_NOT_FOUND: '会话已失效，请重新开始',
  CONVERSATION_MISMATCH: '会话与当前桌台不匹配',
  STALE_TURN: '本次回复已失效，请重新发送',
  AI_UNAVAILABLE: 'AI 暂时不可用',
}

const sourceLabel = (source) => sourceLabels[source] || '本店菜品推荐'
const errorLabel = (code) => errorLabels[code] || '本次无法生成安全的推荐方案'
const confirmLabel = computed(() => (cartStore.mode === 'add' ? '确认并加菜' : '确认并下单'))

const persist = () => {
  saveAiOrderSession(userId.value, tableId, {
    conversationId: conversationId.value,
    messages: messages.value,
    proposal: currentProposal.value,
  })
}

const appendMessage = (message) => {
  messageSequence += 1
  messages.value.push({ id: `${Date.now()}-${messageSequence}`, ...message })
}

const restore = () => {
  const stored = loadAiOrderSession(userId.value, tableId)
  if (!stored) return
  messages.value = stored.messages
  conversationId.value = stored.conversationId || null
  currentProposal.value = stored.proposal || null
}

onMounted(async () => {
  restore()
  const result = await synchronizeTableContext(tableId, { cartStore })
  if (result.error) {
    appendMessage({
      role: 'assistant',
      text: '桌台状态暂时不可用，请返回菜单重试。',
      action: 'MANUAL_ORDER',
      items: [],
      errorCode: 'STATE_UNAVAILABLE',
    })
    currentProposal.value = null
    persist()
  }
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
  if (!text || sending.value || confirming.value) return

  draft.value = ''
  confirmError.value = ''
  currentProposal.value = null
  appendMessage({ role: 'user', text })
  persist()
  sending.value = true

  try {
    const payload = { tableId, message: text }
    if (conversationId.value) payload.conversationId = conversationId.value
    const response = await chatAiOrder(payload)
    conversationId.value = response.conversationId || conversationId.value
    appendMessage({
      role: 'assistant',
      text: response.reply || '本次没有生成可用回复，请手动点餐。',
      action: response.action,
      source: response.source,
      items: response.items || [],
      totalAmount: response.totalAmount,
      proposalId: response.proposalId,
      errorCode: response.errorCode,
    })
    if (
      response.action === 'PROPOSAL' &&
      response.conversationId &&
      response.proposalId &&
      response.items?.length
    ) {
      currentProposal.value = response
    }
  } catch (error) {
    appendMessage({
      role: 'assistant',
      text: error?.message || 'AI 请求失败，请重试或手动点餐。',
      action: 'MANUAL_ORDER',
      items: [],
      errorCode: 'AI_UNAVAILABLE',
    })
  } finally {
    sending.value = false
    persist()
  }
}

const confirmProposal = async () => {
  if (!currentProposal.value || confirming.value || sending.value) return
  confirming.value = true
  confirmError.value = ''
  const proposal = currentProposal.value

  try {
    const result = await confirmAiOrder({
      tableId,
      conversationId: proposal.conversationId,
      proposalId: proposal.proposalId,
    })
    if (!result?.order?.id) throw new Error('订单确认结果不完整，请重试')
    cartStore.setContext(tableId, 'add', result.order)
    clearAiOrderSession()
    showSuccessToast(result.idempotentReplay ? '订单已确认' : 'AI 点餐成功')
    router.replace(`/order-detail/${result.order.id}`)
  } catch (error) {
    confirmError.value = error?.message || '确认失败，请稍后重试'
    if (/方案|会话|过期|失效/.test(confirmError.value)) {
      currentProposal.value = null
    }
    persist()
  } finally {
    confirming.value = false
  }
}

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
