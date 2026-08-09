<template>
  <div class="menu-page">
    <van-nav-bar :title="`桌号 ${cartStore.tableId || '-'} · 点餐`" left-arrow @click-left="goBack" />

    <div class="tab-wrap">
      <van-tabs v-model:active="activeTab" sticky offset-top="46" shrink line-width="24">
        <van-tab title="全部" />
        <van-tab v-for="c in categories" :key="c.id" :title="c.name" />
      </van-tabs>
    </div>

    <div class="dish-grid">
      <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card card">
        <div class="dish-img" :style="imgStyle(dish)">
          <span>{{ dish.name.charAt(0) }}</span>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <div class="dish-desc">{{ dish.description || '暂无描述' }}</div>
          <div class="dish-bottom">
            <span class="price">¥{{ Number(dish.price).toFixed(2) }}</span>
            <van-stepper
              :model-value="cartStore.items[dish.id]?.amount || 0"
              :min="0"
              @update:model-value="(v) => onCount(dish, v)"
            />
          </div>
        </div>
      </div>
    </div>

    <van-empty v-if="filteredDishes.length === 0" description="暂无在售菜品" />

    <!-- 底部结算条 -->
    <van-submit-bar
      v-if="cartStore.totalCount > 0"
      :price="Math.round(cartStore.totalPrice * 100)"
      button-text="去结算"
      @submit="goCart"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { getOnSaleDishes, getCategories } from '../api/menu'

const router = useRouter()
const cartStore = useCartStore()

const dishes = ref([])
const categories = ref([])
const activeTab = ref(0)

// 无图菜品用分类色渐变占位，保证页面美观
const gradients = [
  'linear-gradient(135deg, #ffb199, #ff0844)',
  'linear-gradient(135deg, #a8edea, #2f80ed)',
  'linear-gradient(135deg, #fddb92, #d1fdff)',
  'linear-gradient(135deg, #c2e59c, #64b3f4)',
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
]

const imgStyle = (dish) =>
  dish.image
    ? { backgroundImage: `url(${dish.image})` }
    : { backgroundImage: gradients[dish.categoryId % gradients.length] }

const filteredDishes = computed(() => {
  if (activeTab.value === 0) return dishes.value
  const cat = categories.value[activeTab.value - 1]
  if (!cat) return dishes.value
  return dishes.value.filter((d) => d.categoryId === cat.id)
})

onMounted(async () => {
  try {
    const [dishList, catList] = await Promise.all([getOnSaleDishes(), getCategories()])
    dishes.value = dishList || []
    categories.value = catList || []
  } catch {
    // 拦截器已提示
  }
})

const onCount = (dish, v) => {
  const cur = cartStore.items[dish.id]?.amount || 0
  if (v > cur) {
    cartStore.addItem(dish)
  } else if (v < cur) {
    cartStore.decItem(dish.id)
  }
}

const goCart = () => router.push('/cart')
const goBack = () => router.back()
</script>

<style scoped>
.menu-page {
  min-height: 100vh;
  padding-bottom: 60px;
}

.tab-wrap {
  background: #fff;
  position: sticky;
  top: 46px;
  z-index: 10;
}

.dish-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
}

.dish-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dish-img {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.dish-img[style*='url('] {
  background-size: cover;
  background-position: center;
}

.dish-img[style*='url('] span {
  display: none;
}

.dish-info {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.dish-name {
  font-size: 15px;
  font-weight: 600;
}

.dish-desc {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-bottom {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: 16px;
}
</style>
