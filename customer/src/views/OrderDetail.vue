<template>
  <div class="detail-page">
    <van-nav-bar title="订单详情" left-arrow @click-left="router.back()">
      <template #right>
        <van-button
          class="refresh-button"
          plain
          size="small"
          :loading="refreshing"
          @click="refreshOrder"
        >
          刷新
        </van-button>
      </template>
    </van-nav-bar>

    <template v-if="order">
      <!-- 状态头 -->
      <div class="status-hero" :style="{ background: statusColor }">
        <div class="status-caption">订单当前状态</div>
        <div class="status-text">{{ ORDER_STATUS_TEXT(order.status) }}</div>
        <div class="table-info">桌号 {{ order.tableId }}</div>
      </div>

      <section v-if="order.status !== 0" class="timeline card" aria-label="订单进度">
        <div class="timeline-title">订单进度</div>
        <ol class="timeline-list">
          <li
            v-for="(step, index) in timelineSteps"
            :key="step.label"
            :class="{ completed: index < statusStep, current: index === statusStep }"
          >
            <span class="timeline-dot" />
            <span class="timeline-label">{{ step.label }}</span>
            <span v-if="index === statusStep && order.status !== 5" class="timeline-current"
              >进行中</span
            >
          </li>
        </ol>
      </section>

      <section v-else class="cancel-note card">
        该订单已取消，如需用餐请重新从菜单选择菜品。
      </section>

      <!-- 订单信息 -->
      <div class="card info-card">
        <div class="info-row">
          <span>订单编号</span>
          <span>#{{ order.id }}</span>
        </div>
        <div class="info-row">
          <span>下单时间</span>
          <span>{{ formatTime(order.createTime) }}</span>
        </div>
        <div class="info-row">
          <span>订单状态</span>
          <span>{{ ORDER_STATUS_TEXT(order.status) }}</span>
        </div>
      </div>

      <!-- 菜品明细 -->
      <div class="card detail-card">
        <div class="detail-title">菜品明细</div>
        <div
          v-for="(d, index) in order.details || []"
          :key="`${d.dishId}-${d.price}-${index}`"
          class="detail-row"
        >
          <div class="d-name">
            {{ d.dishName }}
            <span class="d-count">×{{ d.amount }}</span>
          </div>
          <div class="d-price">¥{{ Number(d.price).toFixed(2) }}</div>
        </div>
      </div>

      <!-- 合计 -->
      <div class="card total-card">
        <span>合计</span>
        <span class="price total-price">¥{{ Number(order.totalAmount).toFixed(2) }}</span>
      </div>

      <div class="actions">
        <van-button type="primary" block round size="large" @click="continueOrder">
          {{ order.status === 5 || order.status === 0 ? '返回首页' : '继续加菜' }}
        </van-button>
      </div>
    </template>

    <van-loading v-else-if="loading" class="loading" vertical>正在加载订单</van-loading>
    <van-empty v-else description="未找到这笔订单" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { ORDER_STATUS_TEXT, formatTime } from '../utils/constants'
import { recoverOrderById } from '../services/orderRecovery'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const order = ref(null)
const loading = ref(true)
const refreshing = ref(false)

const statusColors = {
  1: 'var(--status-warning)',
  2: 'var(--status-info)',
  3: '#5f9c6b',
  4: 'var(--status-success)',
  0: '#848b94',
  5: '#737982',
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
    router.replace('/menu')
  } else {
    router.push('/menu')
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-bottom: 24px;
}

.status-hero {
  color: #fff;
  text-align: center;
  padding: 28px 0 38px;
  border-radius: 0 0 24px 24px;
}

.status-caption {
  font-size: 13px;
  opacity: 0.86;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
  margin-top: var(--space-2);
}

.table-info {
  margin-top: var(--space-2);
  font-size: 14px;
  opacity: 0.9;
}

.info-card {
  margin: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

.timeline {
  margin: calc(-1 * var(--space-5)) var(--space-3) var(--space-3);
  padding: var(--space-4);
}

.timeline-title {
  font-size: 15px;
  font-weight: 600;
}

.timeline-list {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-4);
  list-style: none;
}

.timeline-list li {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.timeline-list li:not(:last-child)::after {
  position: absolute;
  top: 5px;
  left: calc(50% + 7px);
  width: calc(100% - 14px);
  height: 2px;
  content: '';
  background: var(--border-subtle);
}

.timeline-list li.completed:not(:last-child)::after {
  background: var(--status-success);
}

.timeline-dot {
  z-index: 1;
  width: 12px;
  height: 12px;
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
  box-shadow: 0 0 0 3px rgb(229 77 46 / 15%);
}

.timeline-label {
  margin-top: var(--space-2);
  white-space: nowrap;
}

.timeline-current {
  margin-top: 2px;
  color: var(--brand-color);
  font-size: 10px;
}

.cancel-note {
  margin: calc(-1 * var(--space-5)) var(--space-3) var(--space-3);
  padding: var(--space-4);
  color: var(--text-sub);
  font-size: 14px;
  line-height: 1.6;
}

.refresh-button {
  --van-button-plain-background: transparent;
  --van-button-default-border-color: var(--border-subtle);
  --van-button-default-color: var(--text-sub);
  min-width: var(--tap-target-min);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-sub);
}

.info-row span:last-child {
  color: var(--text-main);
}

.detail-card {
  margin: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

.detail-title {
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 14px;
}

.d-count {
  color: var(--text-sub);
  font-size: 13px;
}

.d-price {
  font-weight: 600;
}

.total-card {
  margin: 0 var(--space-3);
  padding: var(--space-3) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.total-price {
  font-size: 20px;
}

.actions {
  margin: var(--space-5) var(--space-6);
}

.loading {
  display: flex;
  min-height: 240px;
  justify-content: center;
}
</style>
