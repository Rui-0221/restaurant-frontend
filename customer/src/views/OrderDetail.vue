<template>
  <div class="detail-page">
    <van-nav-bar title="订单详情" left-arrow @click-left="router.back()" />

    <template v-if="order">
      <!-- 状态头 -->
      <div class="status-hero" :style="{ background: statusColor }">
        <div class="status-emoji">🍽️</div>
        <div class="status-text">{{ ORDER_STATUS_TEXT(order.status) }}</div>
        <div class="table-info">桌号 {{ order.tableId }}</div>
      </div>

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
        <div v-for="d in order.details" :key="d.dishId" class="detail-row">
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

    <van-empty v-else-if="!loading" description="没有进行中的订单" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { getTableActiveOrder } from '../api/order'
import { ORDER_STATUS_TEXT, formatTime } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const order = ref(null)
const loading = ref(true)

const statusColors = {
  1: 'linear-gradient(135deg, #f6d365, #fda085)',
  2: 'linear-gradient(135deg, #a1c4fd, #2f80ed)',
  3: 'linear-gradient(135deg, #c2e59c, #64b3f4)',
  4: 'linear-gradient(135deg, #84fab0, #8fd3f4)',
  0: 'linear-gradient(135deg, #cfd9df, #a5b1c2)',
  5: 'linear-gradient(135deg, #cfd9df, #a5b1c2)',
}
const statusColor = computed(() => statusColors[order.value?.status] || statusColors[1])

onMounted(async () => {
  // 优先用提交响应缓存（无需请求），刷新后回退到桌台活跃订单查询
  const cached = cartStore.activeOrder
  if (cached && cached.id === Number(route.params.id)) {
    order.value = cached
    loading.value = false
    return
  }
  try {
    if (cartStore.tableId) {
      order.value = await getTableActiveOrder(cartStore.tableId)
    }
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
})

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
  padding: 36px 0 28px;
  border-radius: 0 0 24px 24px;
}

.status-emoji {
  font-size: 44px;
}

.status-text {
  font-size: 22px;
  font-weight: 700;
  margin-top: 6px;
}

.table-info {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.9;
}

.info-card {
  margin: -14px 12px 0;
  padding: 14px 16px;
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
  margin: 12px;
  padding: 14px 16px;
}

.detail-title {
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #f2f2f2;
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
  margin: 0 12px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.total-price {
  font-size: 20px;
}

.actions {
  margin: 20px 24px;
}
</style>
