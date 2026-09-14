<template>
  <main id="main-content" class="cart-page" tabindex="-1" aria-labelledby="cart-title">
    <CustomerNavBar title="确认菜品" back-label="返回菜单" @back="goMenu" />

    <template v-if="cartStore.tableId">
      <header class="cart-hero">
        <div>
          <p class="eyebrow">
            {{ cartStore.mode === 'add' ? 'ADD DISHES · 继续加菜' : 'NEW ORDER · 新订单' }}
          </p>
          <h1 id="cart-title">
            {{ cartStore.mode === 'add' ? '为本桌追加菜品' : '确认本次点餐' }}
          </h1>
          <p>桌号 {{ cartStore.tableId }} · 提交前仍可调整数量</p>
        </div>
        <div class="mode-mark" :class="{ add: cartStore.mode === 'add' }" aria-hidden="true">
          {{ cartStore.mode === 'add' ? '＋' : '✓' }}
        </div>
      </header>

      <div v-if="contextError" class="context-error card" role="status">
        <div>
          <strong>桌台状态暂时不可用</strong>
          <p>购物车已经保留，请重试后再提交。</p>
        </div>
        <van-button size="small" type="primary" round @click="syncContext">重试</van-button>
      </div>

      <div v-if="cartStore.mode === 'add'" class="add-banner">
        <span class="banner-icon" aria-hidden="true">＋</span>
        <div>
          <strong>加菜模式</strong>
          <span>本次菜品将追加到订单 #{{ cartStore.activeOrder?.id }}</span>
        </div>
      </div>

      <BusinessEmpty v-if="cartStore.totalCount === 0" description="还没有选择菜品">
        <van-button round type="primary" @click="router.back()">返回菜单</van-button>
      </BusinessEmpty>

      <div v-else class="cart-list">
        <section class="items-section" aria-labelledby="selected-dishes-title">
          <div class="section-heading">
            <div>
              <p class="section-kicker">SELECTED</p>
              <h2 id="selected-dishes-title">已选菜品</h2>
            </div>
            <span>{{ cartStore.totalCount }} 份</span>
          </div>

          <article v-for="item in cartStore.list" :key="item.dish.id" class="cart-item card">
            <DishMedia
              class="item-image"
              :name="item.dish.name"
              :image="item.dish.image"
              :category-id="item.dish.categoryId"
              :width="120"
              :height="120"
            />
            <div class="item-info">
              <h3 class="item-name">{{ item.dish.name }}</h3>
              <p class="item-price">单价 <MoneyText :amount="item.dish.price" /></p>
            </div>
            <QuantityControl
              :model-value="item.amount"
              :min="1"
              :max="ORDER_LIMITS.maxAmountPerDish"
              :disabled="recoveryPending"
              :aria-label="`${item.dish.name}数量`"
              :name="`dish-${item.dish.id}-quantity`"
              @update:model-value="(v) => onCount(item.dish, v)"
              @invalid="onInvalid"
            />
          </article>
        </section>

        <section class="order-summary card" aria-labelledby="summary-title">
          <div class="summary-heading">
            <div>
              <p class="section-kicker">ORDER SUMMARY</p>
              <h2 id="summary-title">订单摘要</h2>
            </div>
            <span class="mode-label">{{ cartStore.mode === 'add' ? '加菜' : '新订单' }}</span>
          </div>
          <div class="summary-row">
            <span>菜品数量</span>
            <strong>{{ cartStore.totalCount }} 份 · {{ cartStore.list.length }} 种</strong>
          </div>
          <div class="summary-row total-row">
            <span>预估金额</span>
            <MoneyText class="price" :amount="cartStore.totalPrice" />
          </div>
          <p class="summary-note">最终金额以订单提交成功后的确认金额为准。</p>
        </section>

        <p v-if="recoveryPending" class="recovery-status" role="status" aria-live="polite">
          正在核对最新订单状态…
        </p>

        <div class="clear-bar">
          <van-button plain round :disabled="recoveryPending" @click="clearCart"
            >清空已选</van-button
          >
        </div>
      </div>

      <van-submit-bar
        v-if="cartStore.totalCount > 0"
        :price="Math.round(cartStore.totalPrice * 100)"
        label="预估金额："
        :button-text="cartStore.mode === 'add' ? '确认加菜' : '提交订单'"
        :loading="submitting"
        :disabled="!!contextError"
        safe-area-inset-bottom
        @submit="submit"
      />
    </template>

    <BusinessEmpty v-else description="请先扫码进入点餐" />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showConfirmDialog, showToast } from 'vant'
import { useCartStore } from '../store/cart'
import { ORDER_LIMITS } from '../utils/constants'
import { synchronizeTableContext } from '../services/tableContext'
import { submitOrderWithRecovery } from '../services/orderSubmission'
import { tableMenuPath } from '../router/tableRoutes'
import QuantityControl from '../components/QuantityControl.vue'
import MoneyText from '../components/MoneyText.vue'
import BusinessEmpty from '../components/BusinessEmpty.vue'
import DishMedia from '../components/DishMedia.vue'
import CustomerNavBar from '../components/CustomerNavBar.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const tableId = route.params.tableId
const submitting = ref(false)
const contextError = ref(null)
const recoveryPending = ref(false)

const onCount = (dish, v) => {
  const result = cartStore.setItemAmount(dish, v)
  if (!result.ok) {
    showToast(result.message)
  }
}

const onInvalid = ({ message }) => showToast(message)

const clearCart = async () => {
  await showConfirmDialog({ title: '清空购物车', message: '确定要清空购物车吗？' })
  cartStore.clear()
}

const syncContext = async () => {
  const result = await synchronizeTableContext(tableId, { cartStore })
  contextError.value = result.error
}

const goMenu = () => router.push(tableMenuPath(tableId))

onMounted(syncContext)

const errorMessage = (error) => error?.response?.data?.msg || error?.message || '提交失败'

const confirmRecovery = async ({ mode, activeOrder }) => {
  recoveryPending.value = true
  try {
    const target = activeOrder ? `订单 #${activeOrder.id}` : '新订单'
    await showConfirmDialog({
      title: '订单状态已变化',
      message: `原订单已结束，本次菜品将提交到${target}。是否继续？`,
      confirmButtonText: '继续提交',
      cancelButtonText: '暂不提交',
    })
    return true
  } catch {
    return false
  } finally {
    recoveryPending.value = false
  }
}

const submit = async () => {
  if (submitting.value || contextError.value || !tableId || cartStore.totalCount === 0) return
  if (cartStore.list.length > ORDER_LIMITS.maxKinds) {
    showToast(`一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品`)
    return
  }
  submitting.value = true
  try {
    const submittedMode = cartStore.mode
    const items = cartStore.list.map((i) => ({ dishId: i.dish.id, amount: i.amount }))
    const result = await submitOrderWithRecovery({
      tableId,
      mode: submittedMode,
      activeOrder: cartStore.activeOrder,
      items,
      confirmRecovery,
    })

    if (result.kind === 'success') {
      // 以本次接口响应作为详情页的唯一缓存，避免跳转后再按桌台误取其他订单。
      cartStore.setContext(tableId, 'add', result.order)
      cartStore.resetAfterSubmit()
      showSuccessToast(submittedMode === 'add' ? '加菜成功' : '下单成功')
      router.replace(`/order-detail/${result.order.id}`)
    } else if (result.kind === 'cancelled') {
      cartStore.setContext(tableId, result.mode, result.activeOrder)
    } else if (result.kind === 'recovery-error') {
      contextError.value = result.error
      showToast('无法确认最新订单状态，请刷新上下文后重试')
    } else if (result.kind === 'retry-error') {
      cartStore.setContext(tableId, result.mode, result.activeOrder)
      showToast(errorMessage(result.error))
    } else {
      showToast(errorMessage(result.error))
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cart-page {
  min-height: 100dvh;
  padding-bottom: calc(86px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.cart-page :deep(.van-nav-bar__content) {
  min-height: 56px;
}

.cart-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    radial-gradient(circle at 88% 15%, rgb(229 77 46 / 10%), transparent 12rem), var(--surface);
}

.eyebrow,
.section-kicker {
  color: var(--brand-dark);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.7px;
}

.cart-hero h1 {
  margin-top: 7px;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1.3;
}

.cart-hero p:last-child {
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
}

.mode-mark {
  display: grid;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 25px;
  font-weight: 800;
  place-items: center;
}

.mode-mark.add {
  background: rgb(53 120 200 / 11%);
  color: var(--status-info);
}

.context-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin: var(--space-3);
  padding: 14px;
  border-left: 4px solid var(--status-warning);
  color: var(--status-warning);
}

.context-error strong {
  font-size: 13px;
}

.context-error p {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.add-banner {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: var(--space-3) var(--space-3) 0;
  padding: 13px 14px;
  border: 1px solid rgb(53 120 200 / 18%);
  border-radius: var(--radius-lg);
  background: rgb(53 120 200 / 8%);
  color: var(--status-info);
}

.banner-icon {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: rgb(255 255 255 / 72%);
  font-size: 22px;
  place-items: center;
}

.add-banner div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.add-banner strong {
  font-size: 13px;
}

.add-banner div span {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 18px var(--space-3) var(--space-3);
}

.items-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-heading,
.summary-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-inline: 4px;
}

.section-heading h2,
.summary-heading h2 {
  margin-top: 3px;
  color: var(--text-main);
  font-size: 18px;
}

.section-heading > span {
  color: var(--text-sub);
  font-size: 12px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-lg);
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  font-size: 22px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  overflow: hidden;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-price {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 12px;
}

.order-summary {
  padding: 18px;
  border-radius: var(--radius-lg);
}

.summary-heading {
  align-items: flex-start;
  margin-bottom: 17px;
  padding: 0;
}

.mode-label {
  padding: 4px 9px;
  border-radius: var(--radius-xl);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 11px;
  font-weight: 800;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-block: 7px;
  color: var(--text-sub);
  font-size: 13px;
}

.summary-row strong {
  color: var(--text-main);
  font-weight: 700;
}

.total-row {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-subtle);
  color: var(--text-main);
  font-weight: 700;
}

.total-row .price {
  font-size: 22px;
}

.summary-note {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.recovery-status {
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 12px;
  text-align: center;
}

.clear-bar {
  padding: var(--space-1) 0;
  text-align: center;
}

.clear-bar :deep(.van-button) {
  min-height: var(--tap-target-min);
}

.cart-page :deep(.van-submit-bar) {
  right: auto;
  left: 50%;
  width: min(100%, var(--content-max));
  border-top: 1px solid rgb(233 224 216 / 82%);
  box-shadow: 0 -10px 30px rgb(87 58 39 / 9%);
  transform: translateX(-50%);
}

@media (max-width: 360px) {
  .cart-hero {
    padding-inline: 16px;
  }

  .cart-item {
    gap: 9px;
    padding-inline: 10px;
  }

  .item-image {
    width: 52px;
    height: 52px;
  }
}
</style>
