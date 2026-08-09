<template>
  <div class="cart-page">
    <van-nav-bar title="购物车" left-arrow @click-left="router.back()" />

    <template v-if="cartStore.tableId">
      <div v-if="cartStore.mode === 'add'" class="add-banner">
        ➕ 将追加到订单 #{{ cartStore.activeOrder?.id }}
      </div>

      <van-empty v-if="cartStore.totalCount === 0" description="购物车还是空的" />

      <div v-else class="cart-list">
        <div v-for="item in cartStore.list" :key="item.dish.id" class="cart-item card">
          <div class="item-info">
            <div class="item-name">{{ item.dish.name }}</div>
            <div class="item-price price">¥{{ Number(item.dish.price).toFixed(2) }}</div>
          </div>
          <van-stepper
            :model-value="item.amount"
            :min="1"
            @update:model-value="(v) => onCount(item.dish, v)"
          />
        </div>
        <div class="clear-bar">
          <span @click="clearCart">🗑 清空购物车</span>
        </div>
      </div>

      <van-submit-bar
        v-if="cartStore.totalCount > 0"
        :price="Math.round(cartStore.totalPrice * 100)"
        button-text="提交订单"
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
import { showSuccessToast, showConfirmDialog } from 'vant'
import { useCartStore } from '../store/cart'
import { scanOrder } from '../api/order'

const router = useRouter()
const cartStore = useCartStore()
const submitting = ref(false)

const onCount = (dish, v) => {
  const cur = cartStore.items[dish.id]?.amount || 0
  if (v > cur) {
    cartStore.addItem(dish)
  } else if (v < cur) {
    cartStore.decItem(dish.id)
  }
}

const clearCart = async () => {
  await showConfirmDialog({ title: '清空购物车', message: '确定要清空购物车吗？' })
  cartStore.clear()
}

const submit = async () => {
  if (!cartStore.tableId || cartStore.totalCount === 0) return
  submitting.value = true
  try {
    const items = cartStore.list.map((i) => ({ dishId: i.dish.id, amount: i.amount }))
    // 金额完全由后端重算，前端只传 dishId + amount
    const order = await scanOrder({
      tableId: Number(cartStore.tableId),
      items,
    })
    cartStore.resetAfterSubmit()
    showSuccessToast(cartStore.mode === 'add' ? '加菜成功' : '下单成功')
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
  background: #ecf5ff;
  color: #1989fa;
  font-size: 13px;
  padding: 10px 16px;
}

.cart-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
}

.item-price {
  margin-top: 6px;
  font-size: 15px;
}

.clear-bar {
  text-align: center;
  color: var(--text-sub);
  font-size: 13px;
  padding: 12px 0 4px;
}
</style>
