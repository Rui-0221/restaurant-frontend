<template>
  <div class="cart-page">
    <van-nav-bar title="确认菜品" left-arrow @click-left="router.back()" />

    <template v-if="cartStore.tableId">
      <div v-if="cartStore.mode === 'add'" class="add-banner">
        <span class="banner-title">加菜模式</span>
        <span>将追加到订单 #{{ cartStore.activeOrder?.id }}</span>
      </div>

      <van-empty v-if="cartStore.totalCount === 0" description="还没有选择菜品">
        <van-button round type="primary" @click="router.back()">返回菜单</van-button>
      </van-empty>

      <div v-else class="cart-list">
        <div v-for="item in cartStore.list" :key="item.dish.id" class="cart-item card">
          <div class="item-image" :style="itemImageStyle(item.dish)" aria-hidden="true">
            {{ item.dish.name.charAt(0) }}
          </div>
          <div class="item-info">
            <div class="item-name">{{ item.dish.name }}</div>
            <div class="item-price">单价 ¥{{ Number(item.dish.price).toFixed(2) }}</div>
          </div>
          <van-stepper
            :model-value="item.amount"
            :min="1"
            :max="ORDER_LIMITS.maxAmountPerDish"
            @update:model-value="(v) => onCount(item.dish, v)"
          />
        </div>
        <div class="order-summary card">
          <div class="summary-row">
            <span>已选菜品</span>
            <span>{{ cartStore.totalCount }} 份，共 {{ cartStore.list.length }} 种</span>
          </div>
          <div class="summary-row total-row">
            <span>预估订单金额</span>
            <span class="price">¥{{ cartStore.totalPrice.toFixed(2) }}</span>
          </div>
          <p class="summary-note">最终金额以提交后的订单为准</p>
        </div>
        <div class="clear-bar">
          <van-button plain round size="small" @click="clearCart">清空已选</van-button>
        </div>
      </div>

      <van-submit-bar
        v-if="cartStore.totalCount > 0"
        :price="Math.round(cartStore.totalPrice * 100)"
        label="预估金额："
        :button-text="cartStore.mode === 'add' ? '确认加菜' : '提交订单'"
        :loading="submitting"
        @submit="submit"
      />
    </template>

    <van-empty v-else description="请先扫码进入点餐" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showConfirmDialog, showToast } from 'vant'
import { useCartStore } from '../store/cart'
import { scanOrder } from '../api/order'
import { ORDER_LIMITS } from '../utils/constants'

const router = useRouter()
const cartStore = useCartStore()
const submitting = ref(false)

const gradients = [
  'linear-gradient(135deg, #ffcfb8, #ef7756)',
  'linear-gradient(135deg, #f5e6a2, #d79d49)',
  'linear-gradient(135deg, #b9dfcb, #5eaa88)',
  'linear-gradient(135deg, #c6d9f8, #719ad7)',
]

const itemImageStyle = (dish) =>
  dish.image
    ? { backgroundImage: `url(${dish.image})` }
    : { backgroundImage: gradients[dish.categoryId % gradients.length] }

const onCount = (dish, v) => {
  const result = cartStore.setItemAmount(dish, v)
  if (!result.ok) {
    showToast(result.message)
  }
}

const clearCart = async () => {
  await showConfirmDialog({ title: '清空购物车', message: '确定要清空购物车吗？' })
  cartStore.clear()
}

const submit = async () => {
  if (!cartStore.tableId || cartStore.totalCount === 0) return
  if (cartStore.list.length > ORDER_LIMITS.maxKinds) {
    showToast(`一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品`)
    return
  }
  submitting.value = true
  try {
    const submittedMode = cartStore.mode
    const items = cartStore.list.map((i) => ({ dishId: i.dish.id, amount: i.amount }))
    // 金额完全由后端重算，前端只传 dishId + amount
    const order = await scanOrder({
      tableId: Number(cartStore.tableId),
      items,
    })
    // 以本次接口响应作为详情页的唯一缓存，避免跳转后再按桌台误取其他订单。
    cartStore.setContext(cartStore.tableId, 'add', order)
    cartStore.resetAfterSubmit()
    showSuccessToast(submittedMode === 'add' ? '加菜成功' : '下单成功')
    router.replace(`/order-detail/${order.id}`)
  } catch {
    // 拦截器已提示（如下架菜品）
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  padding-bottom: 60px;
}

.add-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-3) var(--space-3) 0;
  padding: 10px var(--space-3);
  border: 1px solid rgb(25 137 250 / 18%);
  border-radius: var(--radius-md);
  background: rgb(25 137 250 / 8%);
  color: var(--status-info);
  font-size: 13px;
}

.banner-title {
  font-weight: 600;
}

.cart-list {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cart-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
}

.item-image {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  background-position: center;
  background-size: cover;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
}

.item-price {
  margin-top: var(--space-1);
  color: var(--text-sub);
  font-size: 13px;
}

.order-summary {
  padding: var(--space-4);
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-sub);
  font-size: 13px;
}

.total-row {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--border-subtle);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
}

.total-row .price {
  font-size: 20px;
}

.summary-note {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font-size: 12px;
}

.clear-bar {
  text-align: center;
  padding: var(--space-1) 0;
}
</style>
