<template>
  <div class="profile-page">
    <van-nav-bar title="我的" left-arrow @click-left="router.back()" />

    <!-- 用户信息 -->
    <div class="user-card card">
      <div class="avatar">{{ userStore.userInfo?.avatar || '🍜' }}</div>
      <div class="user-info">
        <div class="user-name">{{ userStore.userInfo?.name || '未登录' }}</div>
        <div class="user-phone">{{ userStore.userInfo?.phone || '-' }}</div>
      </div>
    </div>

    <!-- 当前桌台订单 -->
    <div class="section-title">当前桌台</div>
    <template v-if="cartStore.tableId">
      <div v-if="order" class="card order-card" @click="openOrder(order)">
        <div class="order-main">
          <span class="status-tag" :style="{ color: ORDER_STATUS[order.status]?.color }">
            {{ ORDER_STATUS_TEXT(order.status) }}
          </span>
          <span class="order-no">#{{ order.id }}</span>
        </div>
        <div class="order-sub">
          <span>桌号 {{ order.tableId }}</span>
          <span class="order-price">¥{{ Number(order.totalAmount).toFixed(2) }}</span>
        </div>
      </div>
      <div v-else class="card empty-order">
        <span>暂无进行中的订单</span>
        <van-button size="small" type="primary" round @click="router.push(`/table/${cartStore.tableId}`)">去点餐</van-button>
      </div>
    </template>
    <van-empty v-else description="未关联桌台" />

    <!-- 历史订单 -->
    <div class="section-title">历史订单</div>
    <template v-if="historyOrders.length">
      <div v-for="o in historyOrders" :key="o.id" class="card order-card" @click="openOrder(o)">
        <div class="order-main">
          <span class="status-tag" :style="{ color: ORDER_STATUS[o.status]?.color }">
            {{ ORDER_STATUS_TEXT(o.status) }}
          </span>
          <span class="order-no">#{{ o.id }}</span>
        </div>
        <div class="order-sub">
          <span>桌号 {{ o.tableId }} · {{ formatTime(o.createTime) }}</span>
          <span class="order-price">¥{{ Number(o.totalAmount).toFixed(2) }}</span>
        </div>
      </div>
    </template>
    <van-empty v-else description="暂无历史订单" />

    <!-- 退出登录 -->
    <div class="actions">
      <van-button block round size="large" class="logout-btn" @click="onLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { getMe } from '../api/user'
import { getTableActiveOrder, getMyOrders } from '../api/order'
import { ORDER_STATUS, ORDER_STATUS_TEXT, formatTime } from '../utils/constants'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const order = ref(null)
const historyOrders = ref([])

onMounted(async () => {
  // 刷新用户信息（登录时已缓存，此处保证最新）
  try {
    const me = await getMe()
    userStore.setInfo(me)
  } catch {
    // 拦截器已提示
  }

  // 当前桌台活跃订单（有桌台上下文才查）
  const tid = cartStore.tableId
  if (tid) {
    try {
      order.value = await getTableActiveOrder(tid)
    } catch {
      // 拦截器已提示
    }
  }

  // 历史订单（含已结账/已取消，每次进入刷新）
  try {
    historyOrders.value = (await getMyOrders()) || []
  } catch {
    // 拦截器已提示
  }
})

// 打开订单详情：把整单塞进 activeOrder，复用详情页的缓存渲染（历史订单无需再请求）
const openOrder = (o) => {
  cartStore.activeOrder = o
  router.push(`/order-detail/${o.id}`)
}

const onLogout = async () => {
  try {
    await showConfirmDialog({ title: '提示', message: '确定要退出登录吗？' })
  } catch {
    return // 用户取消
  }
  const tid = cartStore.tableId
  userStore.logout()
  cartStore.clear()
  router.replace(tid ? `/table/${tid}` : '/')
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 40px;
}

.card {
  background: #fff;
  border-radius: 12px;
  margin: 12px;
  padding: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a6c, #e54d2e);
  color: #fff;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.user-phone {
  margin-top: 4px;
  font-size: 14px;
  color: #969799;
}

.section-title {
  font-size: 14px;
  color: #969799;
  padding: 8px 16px 0;
}

.order-card {
  cursor: pointer;
}

.order-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-tag {
  font-size: 15px;
  font-weight: 600;
}

.order-no {
  font-size: 14px;
  color: #969799;
}

.order-sub {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #969799;
}

.order-price {
  font-size: 16px;
  font-weight: 700;
  color: #e54d2e;
}

.empty-order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #969799;
}

.actions {
  margin: 32px 12px 0;
}

.logout-btn {
  color: #ee0a24;
  border-color: #ee0a24;
}
</style>
