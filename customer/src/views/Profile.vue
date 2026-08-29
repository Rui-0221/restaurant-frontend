<template>
  <main id="main-content" class="profile-page" tabindex="-1" aria-labelledby="profile-title">
    <CustomerNavBar title="我的" back-label="返回当前桌台" @back="goCurrentTable" />

    <header class="user-hero">
      <div class="user-orb" aria-hidden="true" />
      <div class="avatar" aria-hidden="true">{{ userStore.userInfo?.avatar || '🍜' }}</div>
      <div class="user-info">
        <p class="eyebrow">MY ACCOUNT · 个人中心</p>
        <h1 id="profile-title" class="user-name">{{ userStore.userInfo?.name || '未登录' }}</h1>
        <p class="user-phone">{{ userStore.userInfo?.phone || '-' }}</p>
      </div>
    </header>

    <LoadingSkeleton v-if="profileLoading" :count="2" />

    <template v-else>
      <section class="orders-section" aria-labelledby="current-order-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">CURRENT TABLE</p>
            <h2 id="current-order-title">当前桌台</h2>
          </div>
          <span v-if="cartStore.tableId">桌号 {{ cartStore.tableId }}</span>
        </div>

        <template v-if="cartStore.tableId">
          <button
            v-if="order"
            type="button"
            class="card order-card"
            :style="{
              '--status-color': ORDER_STATUS[order.status]?.color || 'var(--status-neutral)',
            }"
            :aria-label="`查看订单 ${order.id}，状态${ORDER_STATUS_TEXT(order.status)}`"
            @click="openOrder(order)"
          >
            <div class="order-main">
              <span class="status-tag">{{ ORDER_STATUS_TEXT(order.status) }}</span>
              <span class="order-no">订单 #{{ order.id }}</span>
              <span class="order-arrow" aria-hidden="true">→</span>
            </div>
            <div class="order-sub">
              <span>桌号 {{ order.tableId }}</span>
              <MoneyText class="order-price" :amount="order.totalAmount" />
            </div>
          </button>
          <div v-else class="card empty-order">
            <div>
              <strong>暂无进行中的订单</strong>
              <span>从当前桌台开始选择菜品吧</span>
            </div>
            <van-button
              size="small"
              type="primary"
              round
              @click="router.push(tableLandingPath(cartStore.tableId))"
            >
              去点餐
            </van-button>
          </div>
        </template>
        <BusinessEmpty v-else description="未关联桌台" />
      </section>

      <section class="orders-section history-section" aria-labelledby="history-order-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">ORDER HISTORY</p>
            <h2 id="history-order-title">历史订单</h2>
          </div>
          <span v-if="historyOrders.length">{{ historyOrders.length }} 笔</span>
        </div>

        <div v-if="historyOrders.length" class="history-list">
          <button
            v-for="o in historyOrders"
            :key="o.id"
            type="button"
            class="card order-card"
            :style="{ '--status-color': ORDER_STATUS[o.status]?.color || 'var(--status-neutral)' }"
            :aria-label="`查看订单 ${o.id}，状态${ORDER_STATUS_TEXT(o.status)}`"
            @click="openOrder(o)"
          >
            <div class="order-main">
              <span class="status-tag">{{ ORDER_STATUS_TEXT(o.status) }}</span>
              <span class="order-no">订单 #{{ o.id }}</span>
              <span class="order-arrow" aria-hidden="true">→</span>
            </div>
            <div class="order-sub">
              <span>
                桌号 {{ o.tableId }} ·
                <time :datetime="o.createTime">{{ formatTime(o.createTime) }}</time>
              </span>
              <MoneyText class="order-price" :amount="o.totalAmount" />
            </div>
          </button>
        </div>
        <BusinessEmpty v-else description="暂无历史订单" />
      </section>

      <div class="actions">
        <van-button block round size="large" class="logout-btn" @click="onLogout">
          退出登录
        </van-button>
      </div>
    </template>
  </main>
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
import { tableLandingPath } from '../router/tableRoutes'
import BusinessEmpty from '../components/BusinessEmpty.vue'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import MoneyText from '../components/MoneyText.vue'
import CustomerNavBar from '../components/CustomerNavBar.vue'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const order = ref(null)
const historyOrders = ref([])
const profileLoading = ref(true)
const goCurrentTable = () => router.replace(tableLandingPath(cartStore.tableId) || '/')

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
  } finally {
    profileLoading.value = false
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
  router.replace(tableLandingPath(tid) || '/')
}
</script>

<style scoped>
.profile-page {
  min-height: 100dvh;
  padding-bottom: calc(42px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.profile-page :deep(.van-nav-bar__content) {
  min-height: 56px;
}

.user-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  padding: 28px 22px 34px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 12%), transparent 45%),
    linear-gradient(155deg, #c94b2f, var(--brand-dark) 62%, #8f2918);
  color: #fff;
}

.user-orb {
  position: absolute;
  top: -105px;
  right: -80px;
  width: 240px;
  height: 240px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 50%;
}

.avatar {
  position: relative;
  display: grid;
  flex: 0 0 66px;
  width: 66px;
  height: 66px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 14%);
  font-size: 31px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 20%);
  place-items: center;
}

.user-info {
  position: relative;
  flex: 1;
  min-width: 0;
}

.eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.7px;
  opacity: 0.7;
}

.user-name {
  overflow: hidden;
  margin-top: 5px;
  font-size: 23px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-phone {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.82;
}

.orders-section {
  padding: 22px 12px 0;
}

.history-section {
  padding-top: 26px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 10px;
}

.section-kicker {
  color: var(--brand-dark);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.section-heading h2 {
  margin-top: 3px;
  color: var(--text-main);
  font-size: 18px;
}

.section-heading > span {
  color: var(--text-muted);
  font-size: 11px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  display: block;
  width: 100%;
  margin: 0;
  padding: 16px;
  border: 1px solid rgb(233 224 216 / 82%);
  color: inherit;
  font: inherit;
  text-align: left;
  transition:
    transform var(--motion-fast) ease,
    box-shadow var(--motion-fast) ease;
}

.order-card:active {
  transform: scale(0.99);
}

.order-main {
  display: flex;
  align-items: center;
  gap: 9px;
}

.status-tag {
  padding: 4px 9px;
  border-radius: var(--radius-xl);
  background: var(--brand-light);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 800;
  box-shadow: inset 3px 0 0 var(--status-color);
}

.order-no {
  color: var(--text-sub);
  font-size: 12px;
}

.order-arrow {
  margin-left: auto;
  color: var(--brand-dark);
  font-size: 16px;
}

.order-sub {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  color: var(--text-sub);
  font-size: 11px;
}

.order-sub > span {
  min-width: 0;
  line-height: 1.45;
}

.order-price {
  flex: 0 0 auto;
  color: var(--brand-dark);
  font-size: 17px;
  font-weight: 800;
}

.empty-order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 16px;
}

.empty-order div {
  display: flex;
  flex-direction: column;
}

.empty-order strong {
  font-size: 14px;
}

.empty-order span {
  margin-top: 3px;
  color: var(--text-sub);
  font-size: 11px;
}

.actions {
  margin: 34px 18px 0;
}

.logout-btn {
  --van-button-default-color: var(--status-danger);
  --van-button-default-border-color: rgb(210 74 67 / 36%);
  --van-button-default-background: transparent;
  min-height: var(--tap-target-min);
}

@media (hover: hover) {
  .order-card:hover {
    box-shadow: var(--shadow-floating);
    transform: translateY(-2px);
  }
}
</style>
