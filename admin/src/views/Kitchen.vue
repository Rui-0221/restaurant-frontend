<template>
  <SkipLink class="kitchen-skip-link" target-id="kitchen-queues" label="跳至订单队列" />
  <main id="main-content" class="kitchen" tabindex="-1" aria-labelledby="kitchen-title">
    <header class="k-header">
      <div class="k-brand">
        <span class="k-brand-mark" aria-hidden="true">🍳</span>
        <div>
          <span class="k-eyebrow" translate="no">KITCHEN LIVE</span>
          <h1 id="kitchen-title">后厨工作台</h1>
        </div>
      </div>
      <div class="k-session">
        <div class="k-connection" role="status" aria-live="polite">
          <span class="k-dot" :class="{ online: wsConnected }" aria-hidden="true"></span>
          <span class="k-status">{{ wsConnected ? '实时连接中' : '连接断开，重连中…' }}</span>
        </div>
        <time class="k-clock" aria-label="当前时间">{{ now }}</time>
        <el-button class="k-exit" @click="router.push('/dashboard')">返回后台</el-button>
      </div>
    </header>

    <section class="k-ticker" role="status" aria-live="polite" aria-atomic="true">
      <span class="ticker-icon" aria-hidden="true">🔔</span>
      <span v-if="notices.length" :key="notices[0].id" class="ticker-text">
        {{ notices[0].message }}
      </span>
      <span v-else class="ticker-text muted">等待新订单…</span>
    </section>

    <div id="kitchen-queues" v-loading="loading" class="k-queues" tabindex="-1" :aria-busy="loading">
      <section
        v-for="queue in queueColumns"
        :key="queue.key"
        class="k-queue"
        :class="queue.key"
        :aria-labelledby="`queue-${queue.key}`"
      >
        <header class="queue-header">
          <div>
            <span class="queue-eyebrow">{{ queue.eyebrow }}</span>
            <h2 :id="`queue-${queue.key}`">{{ queue.title }}</h2>
          </div>
          <span class="queue-count" :aria-label="`${queue.title}${queue.orders.length}单`">
            {{ queue.orders.length }} 单
          </span>
        </header>
        <div class="k-grid">
          <article v-for="o in queue.orders" :key="o.id" class="k-card" :class="`st-${o.status}`">
            <header class="k-card-head">
              <div>
                <span class="order-number" translate="no">ORDER #{{ o.id }}</span>
                <h3>桌 {{ o.tableId }}</h3>
              </div>
              <span class="k-status-tag">{{ ORDER_STATUS[o.status]?.label }}</span>
              <div class="k-time">
                <span>{{ o.status === 1 ? '已等待' : '制作计时' }}</span>
                <strong>{{ elapsed(o.createTime) }}</strong>
              </div>
            </header>
            <div class="order-meta">
              <span>{{ o.details?.length || 0 }} 种菜品</span>
              <span>共 {{ dishAmount(o) }} 份</span>
            </div>
            <ul class="k-items" :aria-label="`桌 ${o.tableId} 菜品明细`">
              <li
                v-for="(d, index) in o.details"
                :key="`${d.dishId}-${d.price}-${index}`"
                class="k-item"
              >
                <span>{{ d.dishName }}</span><strong class="k-amount">×{{ d.amount }}</strong>
              </li>
            </ul>
            <div class="k-card-foot">
              <div class="k-total">
                <span>订单金额</span>
                <MoneyValue :amount="o.totalAmount" />
              </div>
              <el-button
                v-if="o.status === 1"
                type="primary"
                :loading="cookingOrderId === o.id"
                @click="startCooking(o)"
              >
                开始制作
              </el-button>
              <span v-else class="cooking-note">正在制作，请及时更新出餐进度</span>
            </div>
          </article>
        </div>
        <div v-if="!loading && queue.orders.length === 0" class="queue-empty">
          <span aria-hidden="true">✓</span>
          <strong>暂无{{ queue.title }}订单</strong>
          <small>新订单到达后会自动出现在这里</small>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MoneyValue from '../components/MoneyValue.vue'
import SkipLink from '../components/SkipLink.vue'
import { useAuthStore } from '../store/auth'
import { getOrders, changeOrderStatus } from '../api/modules'
import { ORDER_STATUS } from '../utils/constants'
import { createKitchenLifecycle } from '../services/kitchenLifecycle'
import { buildKitchenQueues } from '../services/kitchenQueues'

const router = useRouter()
const auth = useAuthStore()

const list = ref([])
const loading = ref(false)
const wsConnected = ref(false)
const notices = ref([])
const now = ref('')
const cookingOrderId = ref(null)

// ---------- 订单数据 ----------
// 仅保留厨师真正需要处理的两类订单，避免上菜/用餐订单干扰工作队列。
const queues = computed(() => buildKitchenQueues(list.value))
const queueColumns = computed(() => [
  { key: 'pending', eyebrow: '下一步处理', title: '待制作', orders: queues.value.pending },
  { key: 'cooking', eyebrow: '正在进行', title: '制作中', orders: queues.value.cooking },
])
const dishAmount = (order) =>
  (order.details || []).reduce((sum, detail) => sum + Number(detail.amount || 0), 0)

const loadOrders = async () => {
  try {
    const res = await getOrders(1, 100)
    list.value = res.list || []
  } catch {
    // 拦截器已提示
  }
}

// 开始制作（后厨角色唯一操作）
const startCooking = async (o) => {
  cookingOrderId.value = o.id
  try {
    await changeOrderStatus(o.id, 2)
    ElMessage.success(`订单 #${o.id} 开始制作`)
    loadOrders()
  } catch {
    // 拦截器已提示
  } finally {
    cookingOrderId.value = null
  }
}

// ---------- WebSocket ----------
let ws = null
let isUnmounted = false
const lifecycle = createKitchenLifecycle()

const connectWs = () => {
  if (isUnmounted) return
  const token = auth.token
  if (!token) return
  // 后厨屏只需厨师 token（role=3），服务端握手校验
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(import.meta.env.DEV
    ? `ws://${location.hostname}:8080/ws/kitchen?token=${token}` // 开发：直连后端
    : `${proto}://${location.host}/ws/kitchen?token=${token}` // 生产：同源走 Nginx /ws 反代
  )

  ws.onopen = () => {
    wsConnected.value = true
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      // 新订单/加菜 → 滚动播报 + 提示音 + 刷新列表
      notices.value.unshift({ id: `${Date.now()}-${Math.random()}`, message: data.message || '新消息' })
      if (notices.value.length > 5) notices.value.pop()
      beep()
      loadOrders()
    } catch {
      // 忽略非 JSON 消息
    }
  }

  ws.onclose = () => {
    wsConnected.value = false
    if (!isUnmounted) scheduleReconnect()
  }

  ws.onerror = () => {
    ws.close()
  }
}

// 断线 3 秒后重连
const scheduleReconnect = () => {
  if (isUnmounted) return
  lifecycle.scheduleReconnect(() => {
    if (!isUnmounted && auth.isLogin) connectWs()
  }, 3000)
}

// 提示音（WebAudio，无需音频文件）
const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    setTimeout(() => ctx.close(), 500)
  } catch {
    // 浏览器不支持则静默
  }
}

// ---------- 时钟与时长 ----------
const elapsed = (createTime) => {
  if (!createTime) return ''
  const start = new Date(createTime)
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}

const clockFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const tick = () => {
  now.value = clockFormatter.format(new Date())
}

onMounted(() => {
  loadOrders()
  connectWs()
  tick()
  lifecycle.start(tick, loadOrders)
})

onBeforeUnmount(() => {
  isUnmounted = true
  lifecycle.dispose(ws)
})
</script>

<style scoped>
.kitchen {
  --k-bg: #171a18;
  --k-surface: #222520;
  --k-surface-raised: #292d27;
  --k-border: #3b4038;
  --k-text: #f7f1e9;
  --k-muted: #aaa69f;
  --k-gold: #f3bf65;
  --k-pending: #e99a3c;
  --k-cooking: #61a0d8;

  color-scheme: dark;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 18px 22px max(26px, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 12% 0%, rgb(229 77 46 / 13%), transparent 30rem),
    linear-gradient(160deg, #171a18 0%, #1b1e1a 55%, #141613 100%);
  color: var(--k-text);
}

.kitchen-skip-link:focus {
  background: var(--k-surface-raised);
  color: var(--k-gold);
}

.k-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
  padding: 4px 2px;
}

.k-brand,
.k-session,
.k-connection {
  display: flex;
  align-items: center;
}

.k-brand {
  gap: 13px;
}

.k-brand-mark {
  display: grid;
  width: 48px;
  height: 48px;
  border: 1px solid rgb(243 191 101 / 28%);
  border-radius: 15px;
  background: rgb(243 191 101 / 10%);
  font-size: 23px;
  place-items: center;
}

.k-eyebrow {
  color: var(--k-gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.k-brand h1 {
  margin-top: 2px;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

.k-session {
  gap: 16px;
}

.k-connection {
  gap: 10px;
}

.k-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--status-danger);
  box-shadow: 0 0 0 5px rgb(210 74 67 / 11%);
}

.k-dot.online {
  background: #63bf8d;
  box-shadow: 0 0 0 5px rgb(99 191 141 / 12%);
}

.k-status {
  font-size: 13px;
  color: var(--k-muted);
}

.k-clock {
  color: var(--k-gold);
  font-family: Consolas, 'SFMono-Regular', monospace;
  font-size: 24px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.k-exit {
  min-height: var(--tap-target-min);
  border-color: var(--k-border);
  background: transparent;
  color: var(--k-text);
}

.k-exit:hover,
.k-exit:focus-visible {
  border-color: var(--k-gold);
  background: rgb(243 191 101 / 8%);
  color: var(--k-gold);
}

.k-ticker {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  margin-bottom: 18px;
  overflow: hidden;
  padding: 10px 14px;
  border: 1px solid rgb(243 191 101 / 18%);
  border-radius: var(--radius-md);
  background: rgb(243 191 101 / 8%);
}

.ticker-icon {
  font-size: 16px;
}

.ticker-text {
  overflow: hidden;
  color: var(--k-gold);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
  animation: slidein 300ms ease;
}

.ticker-text.muted {
  color: var(--k-muted);
}

@keyframes slidein {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.k-queues {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 360px;
}

.k-queues :deep(.el-loading-mask) {
  background: rgb(23 26 24 / 78%);
}

.k-queue {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--k-border);
  border-radius: var(--radius-lg);
  background: rgb(34 37 32 / 72%);
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 0 2px;
}

.queue-eyebrow {
  color: var(--k-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.4px;
}

.queue-header h2 {
  margin-top: 3px;
  font-size: 20px;
}

.queue-count {
  min-width: 58px;
  padding: 6px 10px;
  border: 1px solid var(--k-border);
  border-radius: var(--radius-xl);
  background: var(--k-surface-raised);
  color: var(--k-gold);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.k-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.k-card {
  overflow: hidden;
  padding: 17px;
  border: 1px solid var(--k-border);
  border-top: 4px solid var(--k-muted);
  border-radius: var(--radius-md);
  background: var(--k-surface);
  box-shadow: 0 14px 34px rgb(0 0 0 / 18%);
}

.k-card.st-1 {
  border-top-color: var(--k-pending);
}

.k-card.st-2 {
  border-top-color: var(--k-cooking);
}

.k-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.order-number {
  color: var(--k-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1px;
}

.k-card-head h3 {
  margin-top: 2px;
  color: var(--k-text);
  font-size: 24px;
  line-height: 1.15;
}

.k-status-tag {
  padding: 4px 9px;
  border-radius: var(--radius-xl);
  background: rgb(255 255 255 / 8%);
  color: #d8d3cc;
  font-size: 12px;
  font-weight: 700;
}

.k-time {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
}

.k-time span {
  color: var(--k-muted);
  font-size: 10px;
}

.k-time strong {
  color: var(--k-gold);
  font-family: Consolas, 'SFMono-Regular', monospace;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
}

.order-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.order-meta span {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: rgb(255 255 255 / 5%);
  color: var(--k-muted);
  font-size: 11px;
}

.k-items {
  margin: 0 0 14px;
  padding: 10px 0;
  border-top: 1px dashed var(--k-border);
  border-bottom: 1px dashed var(--k-border);
  list-style: none;
}

.k-item {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 5px 2px;
  color: var(--k-text);
  font-size: 15px;
}

.k-amount {
  color: var(--k-gold);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.k-card-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.k-total {
  display: flex;
  flex-direction: column;
}

.k-total span {
  color: var(--k-muted);
  font-size: 10px;
}

.k-total :deep(.money-value) {
  color: var(--k-gold);
  font-size: 18px;
  font-weight: 800;
}

.k-card-foot :deep(.el-button) {
  min-width: 112px;
  min-height: var(--tap-target-min);
}

.cooking-note {
  max-width: 172px;
  color: var(--k-muted);
  font-size: 11px;
  text-align: right;
}

.queue-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  min-height: 210px;
  padding: 48px 20px;
  border: 1px dashed var(--k-border);
  border-radius: var(--radius-md);
  color: var(--k-muted);
  text-align: center;
}

.queue-empty > span {
  display: grid;
  width: 42px;
  height: 42px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: rgb(99 191 141 / 10%);
  color: #70c798;
  font-size: 20px;
  place-items: center;
}

.queue-empty strong {
  color: #d8d3cc;
  font-size: 14px;
}

.queue-empty small {
  margin-top: 4px;
  color: var(--k-muted);
}

@media (max-width: 900px) {
  .k-header,
  .k-session {
    align-items: flex-start;
  }

  .k-header {
    flex-direction: column;
  }

  .k-session {
    flex-wrap: wrap;
    width: 100%;
  }

  .k-clock {
    margin-left: auto;
  }

  .k-queues {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .kitchen {
    padding: 14px 12px max(20px, env(safe-area-inset-bottom));
  }

  .k-session {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .k-connection {
    grid-column: 1 / -1;
  }

  .k-clock {
    margin-left: 0;
  }

  .k-exit {
    justify-self: end;
  }

  .k-queue {
    padding: 12px;
  }

  .k-grid {
    grid-template-columns: 1fr;
  }

  .k-card-head {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .k-time {
    grid-column: 1 / -1;
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--k-border);
  }

  .k-card-foot {
    align-items: stretch;
    flex-direction: column;
  }

  .cooking-note {
    max-width: none;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-text {
    animation: none;
  }

  .k-dot,
  .k-dot.online {
    box-shadow: none;
  }
}
</style>
