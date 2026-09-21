<template>
  <main id="main-content" class="menu-page" tabindex="-1" aria-labelledby="menu-title">
    <CustomerNavBar
      :title="`桌号 ${cartStore.tableId || '-'} · 点餐`"
      back-label="返回桌台页"
      @back="goBack"
    >
      <template #right>
        <button type="button" class="profile-entry" aria-label="打开我的订单" @click="goProfile">
          <span class="entry-icon" aria-hidden="true">👤</span>
          <span class="entry-text">我的</span>
        </button>
      </template>
    </CustomerNavBar>

    <header class="menu-intro">
      <div>
        <p class="eyebrow">TODAY'S MENU · 今日菜单</p>
        <h1 id="menu-title">今天想吃点什么？</h1>
        <p>现点现做，慢慢挑选喜欢的菜品。</p>
      </div>
      <div class="table-chip">
        <span>桌号</span>
        <strong>{{ cartStore.tableId || '-' }}</strong>
      </div>
    </header>

    <button type="button" class="ai-entry card" @click="goAiOrder">
      <span class="ai-entry-mark" aria-hidden="true">AI</span>
      <span class="ai-entry-copy">
        <strong>不想慢慢挑？让 AI 帮你点</strong>
        <span>说出口味、菜系或忌口，也可以直接推荐招牌菜</span>
      </span>
      <span class="ai-entry-arrow" aria-hidden="true">→</span>
    </button>

    <div class="tab-wrap">
      <van-tabs v-model:active="activeTab" shrink line-width="24">
        <van-tab title="全部" />
        <van-tab v-for="c in categories" :key="c.id" :title="c.name" />
      </van-tabs>
    </div>

    <div v-if="contextError" class="context-error card" role="status">
      <div>
        <strong>桌台状态暂时不可用</strong>
        <p>购物车已保留，请重试后再结算。</p>
      </div>
      <van-button size="small" type="primary" round @click="syncContext">重试</van-button>
    </div>

    <LoadingSkeleton v-if="menuLoading" :count="3" />

    <div v-else-if="filteredDishes.length" class="dish-list">
      <article v-for="dish in filteredDishes" :key="dish.id" class="dish-card card">
        <DishMedia
          class="dish-image"
          :name="dish.name"
          :image="dish.image"
          :category-id="dish.categoryId"
          :width="240"
          :height="180"
        />
        <div class="dish-info">
          <div>
            <h2 class="dish-name">{{ dish.name }}</h2>
            <p class="dish-desc">{{ dish.description || '本店精选菜品，现点现做。' }}</p>
          </div>
          <div class="dish-bottom">
            <MoneyText class="price" :amount="dish.price" />
            <QuantityControl
              :model-value="cartStore.items[dish.id]?.amount || 0"
              :min="0"
              :max="ORDER_LIMITS.maxAmountPerDish"
              :aria-label="`${dish.name}数量`"
              :name="`dish-${dish.id}-quantity`"
              @update:model-value="(v) => onCount(dish, v)"
              @invalid="onInvalid"
            />
          </div>
        </div>
      </article>
    </div>

    <BusinessEmpty v-else description="暂无在售菜品" />

    <van-submit-bar
      v-if="cartStore.totalCount > 0"
      :price="Math.round(cartStore.totalPrice * 100)"
      button-text="去结算"
      :disabled="!!contextError"
      safe-area-inset-bottom
      @submit="goCart"
    />
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useCartStore } from '../store/cart'
import { getOnSaleDishes, getCategories } from '../api/menu'
import { ORDER_LIMITS } from '../utils/constants'
import { synchronizeTableContext } from '../services/tableContext'
import { tableAiOrderPath, tableCartPath } from '../router/tableRoutes'
import QuantityControl from '../components/QuantityControl.vue'
import CustomerNavBar from '../components/CustomerNavBar.vue'
import MoneyText from '../components/MoneyText.vue'
import BusinessEmpty from '../components/BusinessEmpty.vue'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import DishMedia from '../components/DishMedia.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const tableId = route.params.tableId

const dishes = ref([])
const categories = ref([])
const activeTab = ref(0)
const contextError = ref(null)
const menuLoading = ref(true)

const filteredDishes = computed(() => {
  if (activeTab.value === 0) return dishes.value
  const cat = categories.value[activeTab.value - 1]
  if (!cat) return dishes.value
  return dishes.value.filter((d) => d.categoryId === cat.id)
})

const syncContext = async () => {
  const result = await synchronizeTableContext(tableId, { cartStore })
  contextError.value = result.error
}

onMounted(async () => {
  await syncContext()
  try {
    const [dishList, catList] = await Promise.all([getOnSaleDishes(), getCategories()])
    dishes.value = dishList || []
    categories.value = catList || []
  } catch {
    // 拦截器已提示
  } finally {
    menuLoading.value = false
  }
})

const onCount = (dish, v) => {
  const result = cartStore.setItemAmount(dish, v)
  if (!result.ok) {
    showToast(result.message)
  }
}

const onInvalid = ({ message }) => showToast(message)

const goCart = () => {
  if (!contextError.value) router.push(tableCartPath(tableId))
}
const goAiOrder = () => {
  if (!contextError.value) router.push(tableAiOrderPath(tableId))
}
const goBack = () => router.back()
const goProfile = () => router.push('/profile')
</script>

<style scoped>
.menu-page {
  min-height: 100dvh;
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.menu-page :deep(.van-nav-bar__content) {
  min-height: 56px;
}

.profile-entry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: var(--tap-target-min);
  padding: 5px 13px;
  border: 0;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--brand-dark), var(--brand-active));
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 6px 16px rgb(229 77 46 / 20%);
}

.entry-icon {
  font-size: 14px;
}

.menu-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    radial-gradient(circle at 90% 10%, rgb(229 77 46 / 9%), transparent 12rem), var(--surface);
}

.eyebrow {
  color: var(--brand-dark);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.menu-intro h1 {
  margin-top: 7px;
  color: var(--text-main);
  font-size: 25px;
  line-height: 1.25;
  letter-spacing: -0.5px;
}

.menu-intro p:last-child {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 12px;
}

.table-chip {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
  padding: 8px 12px;
  border: 1px solid rgb(229 77 46 / 14%);
  border-radius: var(--radius-lg);
  background: var(--brand-light);
  color: var(--brand-dark);
}

.table-chip span {
  font-size: 10px;
  letter-spacing: 2px;
}

.table-chip strong {
  margin-top: 2px;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tab-wrap {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-subtle);
  background: rgb(255 253 250 / 95%);
  backdrop-filter: blur(14px);
}

.ai-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 24px);
  min-height: 74px;
  margin: 12px;
  padding: 13px 14px;
  border-color: rgb(229 77 46 / 18%);
  color: inherit;
  text-align: left;
}

.ai-entry-mark {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: linear-gradient(145deg, var(--brand-dark), var(--brand-active));
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  place-items: center;
}

.ai-entry-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.ai-entry-copy strong {
  color: var(--text-main);
  font-size: 14px;
}

.ai-entry-copy span {
  margin-top: 3px;
  color: var(--text-sub);
  font-size: 10px;
  line-height: 1.45;
}

.ai-entry-arrow {
  color: var(--brand-dark);
  font-size: 20px;
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

.dish-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}

.dish-card {
  display: flex;
  min-height: 132px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.dish-image {
  width: 116px;
  min-height: 132px;
}

.dish-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 15px 14px;
}

.dish-name {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.dish-desc {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dish-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
}

.price {
  font-size: 17px;
}

.menu-page :deep(.van-submit-bar) {
  right: auto;
  left: 50%;
  width: min(100%, var(--content-max));
  border-top: 1px solid rgb(233 224 216 / 82%);
  box-shadow: 0 -10px 30px rgb(87 58 39 / 9%);
  transform: translateX(-50%);
}

@media (max-width: 360px) {
  .menu-intro {
    padding-inline: 16px;
  }

  .menu-intro h1 {
    font-size: 22px;
  }

  .dish-image {
    width: 98px;
  }

  .dish-info {
    padding-inline: 12px;
  }

  .entry-text {
    display: none;
  }
}
</style>
