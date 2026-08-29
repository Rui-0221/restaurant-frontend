<template>
  <main id="main-content" class="detail-page" tabindex="-1" aria-labelledby="order-status-title">
    <CustomerNavBar title="订单详情" @back="router.back()">
      <template #right>
        <van-button
          class="refresh-button"
          plain
          size="small"
          :loading="refreshing"
          :aria-busy="refreshing"
          @click="refreshOrder"
        >
          刷新
        </van-button>
      </template>
    </CustomerNavBar>

    <template v-if="order">
      <header class="status-hero" :style="{ '--status-color': statusColor }">
        <p class="status-caption">ORDER STATUS · 订单状态</p>
        <h1 id="order-status-title" class="status-text" role="status" aria-live="polite">
          {{ ORDER_STATUS_TEXT(order.status) }}
        </h1>
        <div class="status-meta">
          <span>订单 #{{ order.id }}</span>
          <span>桌号 {{ order.tableId }}</span>
        </div>
      </header>

      <section v-if="order.status !== 0" class="timeline card" aria-labelledby="timeline-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">PROGRESS</p>
            <h2 id="timeline-title">订单进度</h2>
          </div>
          <span class="progress-label">实时更新</span>
        </div>
        <ol class="timeline-list">
          <li
            v-for="(step, index) in timelineSteps"
            :key="step.label"
            :class="{ completed: index < statusStep, current: index === statusStep }"
            :aria-current="index === statusStep ? 'step' : undefined"
          >
            <span class="timeline-dot" aria-hidden="true" />
            <span class="timeline-label">{{ step.label }}</span>
            <span v-if="index === statusStep && order.status !== 5" class="timeline-current">
              进行中
            </span>
          </li>
        </ol>
      </section>

      <section v-else class="cancel-note card" aria-label="订单取消说明">
        <span class="cancel-icon" aria-hidden="true">!</span>
        <div>
          <strong>订单已取消</strong>
          <p>如需继续用餐，请返回首页重新选择菜品。</p>
        </div>
      </section>

      <section class="card info-card" aria-labelledby="order-info-title">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">INFORMATION</p>
            <h2 id="order-info-title">订单信息</h2>
          </div>
        </div>
        <dl>
          <div class="info-row">
            <dt>订单编号</dt>
            <dd>#{{ order.id }}</dd>
          </div>
          <div class="info-row">
            <dt>下单时间</dt>
            <dd>{{ formatTime(order.createTime) }}</dd>
          </div>
          <div class="info-row">
            <dt>订单状态</dt>
            <dd>{{ ORDER_STATUS_TEXT(order.status) }}</dd>
          </div>
        </dl>
      </section>

      <section class="card detail-card" aria-labelledby="dish-detail-title">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">DISHES</p>
            <h2 id="dish-detail-title">菜品明细</h2>
          </div>
          <span>{{ order.details?.length || 0 }} 种</span>
        </div>
        <div class="detail-list">
          <div
            v-for="(d, index) in order.details || []"
            :key="`${d.dishId}-${d.price}-${index}`"
            class="detail-row"
          >
            <div class="dish-sequence" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </div>
            <div class="d-name">
              <strong>{{ d.dishName }}</strong>
              <span class="d-count">数量 ×{{ d.amount }}</span>
            </div>
            <MoneyText class="d-price" :amount="d.price" />
          </div>
        </div>
      </section>

      <section class="card total-card" aria-label="订单合计">
        <div>
          <p class="section-kicker">TOTAL</p>
          <strong>已确认金额</strong>
        </div>
        <MoneyText class="price total-price" :amount="order.totalAmount" />
      </section>

      <div class="actions">
        <van-button type="primary" block round size="large" @click="continueOrder">
          {{ order.status === 5 || order.status === 0 ? '返回首页' : '继续加菜' }}
        </van-button>
      </div>
    </template>

    <LoadingSkeleton v-else-if="loading" :count="2" />
    <BusinessEmpty v-else description="未找到这笔订单" />
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { ORDER_STATUS_TEXT, formatTime } from '../utils/constants'
import { recoverOrderById } from '../services/orderRecovery'
import { tableLandingPath, tableMenuPath } from '../router/tableRoutes'
import MoneyText from '../components/MoneyText.vue'
import BusinessEmpty from '../components/BusinessEmpty.vue'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import CustomerNavBar from '../components/CustomerNavBar.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const order = ref(null)
const loading = ref(true)
const refreshing = ref(false)

const statusColors = {
  0: 'var(--status-neutral)',
  1: 'var(--status-warning)',
  2: 'var(--status-info)',
  3: 'var(--status-info)',
  4: 'var(--status-success)',
  5: 'var(--status-neutral)',
}
const statusColor = computed(() => statusColors[order.value?.status] || statusColors[1])
const timelineSteps = [
  { label: '已下单' },
  { label: '制作中' },
  { label: '等待上菜' },
  { label: '用餐中' },
  { label: '已结账' },
]
const statusStep = computed(() => {
  if (order.value?.status === 5) return 4
  return Math.max(0, Number(order.value?.status || 1) - 1)
})

const loadOrder = async (preferCache = true) => {
  const orderId = Number(route.params.id)
  if (!Number.isInteger(orderId) || orderId < 1) {
    loading.value = false
    return
  }

  // 优先用提交响应缓存（无需请求）。
  const cached = cartStore.activeOrder
  if (preferCache && cached && Number(cached.id) === orderId) {
    order.value = cached
    loading.value = false
    return
  }

  try {
    order.value = await recoverOrderById(orderId, cartStore.tableId)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

onMounted(loadOrder)

const refreshOrder = async () => {
  refreshing.value = true
  try {
    await loadOrder(false)
  } finally {
    refreshing.value = false
  }
}

const continueOrder = () => {
  if (order.value?.status === 5 || order.value?.status === 0) {
    router.replace(tableLandingPath(order.value?.tableId) || '/')
  } else {
    router.push(tableMenuPath(order.value?.tableId) || '/')
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100dvh;
  padding-bottom: calc(30px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.detail-page :deep(.van-nav-bar__content) {
  min-height: 56px;
}

.status-hero {
  position: relative;
  overflow: hidden;
  padding: 34px 20px 54px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background:
    linear-gradient(rgb(45 41 38 / 58%), rgb(45 41 38 / 58%)),
    linear-gradient(145deg, rgb(255 255 255 / 15%), transparent 45%), var(--status-color);
  color: #fff;
  text-align: center;
}

.status-hero::after {
  position: absolute;
  right: -56px;
  bottom: -92px;
  width: 210px;
  height: 210px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  content: '';
}

.status-caption {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  opacity: 0.78;
}

.status-text {
  margin-top: 8px;
  font-size: 30px;
  line-height: 1.3;
  letter-spacing: 1px;
}

.status-meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.status-meta span {
  padding: 5px 10px;
  border: 1px solid rgb(255 255 255 / 17%);
  border-radius: var(--radius-xl);
  background: rgb(255 255 255 / 10%);
  font-size: 11px;
}

.timeline,
.cancel-note {
  position: relative;
  z-index: 1;
  width: min(calc(100% - 24px), 620px);
  margin: -30px auto 0;
  padding: 18px;
  border-radius: var(--radius-lg);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-heading.compact {
  align-items: flex-end;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--border-subtle);
}

.section-kicker {
  color: var(--brand-dark);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.section-heading h2 {
  margin-top: 3px;
  color: var(--text-main);
  font-size: 17px;
}

.progress-label,
.section-heading > span {
  color: var(--text-muted);
  font-size: 11px;
}

.timeline-list {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  list-style: none;
}

.timeline-list li {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  color: var(--text-muted);
  font-size: 10px;
  text-align: center;
}

.timeline-list li:not(:last-child)::after {
  position: absolute;
  top: 6px;
  left: calc(50% + 8px);
  width: calc(100% - 16px);
  height: 2px;
  background: var(--border-subtle);
  content: '';
}

.timeline-list li.completed:not(:last-child)::after {
  background: var(--status-success);
}

.timeline-dot {
  z-index: 1;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-subtle);
  border-radius: 50%;
  background: var(--surface);
}

.timeline-list .completed,
.timeline-list .current {
  color: var(--text-main);
}

.timeline-list .completed .timeline-dot {
  border-color: var(--status-success);
  background: var(--status-success);
}

.timeline-list .current .timeline-dot {
  border-color: var(--brand-color);
  background: var(--brand-color);
  box-shadow: 0 0 0 4px rgb(229 77 46 / 14%);
}

.timeline-label {
  margin-top: 8px;
  white-space: nowrap;
}

.timeline-current {
  margin-top: 2px;
  color: var(--brand-dark);
  font-size: 9px;
  font-weight: 700;
}

.cancel-note {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cancel-icon {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: rgb(210 74 67 / 10%);
  color: var(--status-danger);
  font-weight: 800;
  place-items: center;
}

.cancel-note strong {
  font-size: 14px;
}

.cancel-note p {
  margin-top: 3px;
  color: var(--text-sub);
  font-size: 12px;
}

.refresh-button {
  --van-button-plain-background: transparent;
  --van-button-default-border-color: var(--border-subtle);
  --van-button-default-color: var(--text-sub);
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
}

.info-card,
.detail-card,
.total-card {
  width: min(calc(100% - 24px), 620px);
  margin: var(--space-3) auto 0;
  padding: 18px;
  border-radius: var(--radius-lg);
}

.info-card dl {
  margin-top: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.info-row dd {
  color: var(--text-main);
  font-weight: 600;
  text-align: right;
}

.detail-list {
  margin-top: 2px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 0;
  border-bottom: 1px solid rgb(233 224 216 / 68%);
}

.detail-row:last-child {
  border-bottom: 0;
}

.dish-sequence {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: #fbf7f3;
  color: var(--text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  place-items: center;
}

.d-name {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.d-name strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-count {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.d-price {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.total-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total-card strong {
  display: block;
  margin-top: 3px;
  font-size: 14px;
}

.total-price {
  font-size: 24px;
}

.actions {
  width: min(calc(100% - 48px), 560px);
  margin: 22px auto 0;
}

@media (max-width: 380px) {
  .timeline,
  .info-card,
  .detail-card,
  .total-card {
    width: calc(100% - 20px);
  }

  .timeline {
    padding-inline: 12px;
  }

  .timeline-label {
    font-size: 9px;
  }
}
</style>
