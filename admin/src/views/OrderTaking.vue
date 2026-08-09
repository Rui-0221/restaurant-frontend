<template>
  <div class="order-taking">
    <!-- 顶部：桌台选择 + 提交栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="label">桌台</span>
          <el-select v-model="tableId" placeholder="请选择桌台" style="width: 220px" clearable>
            <el-option
              v-for="t in tables"
              :key="t.id"
              :label="`${t.name}（${t.status === 0 ? '空闲' : '占用'}）`"
              :value="t.id"
            />
          </el-select>
          <span v-if="selectedTable" class="table-tip" :class="selectedTable.status === 0 ? 'free' : 'busy'">
            {{ selectedTable.status === 0 ? '该桌空闲，提交将创建新订单' : '该桌已有订单，提交将自动加菜' }}
          </span>
        </div>
        <div class="toolbar-right">
          <span v-if="cartCount > 0" class="cart-summary">已选 {{ cartCount }} 项，合计 ¥{{ cartTotal.toFixed(2) }}</span>
          <el-button type="primary" :disabled="!canSubmit" :loading="submitting" @click="onSubmit">
            提交订单
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 菜品区域：分类 + 在售菜品 -->
    <el-card shadow="never" class="dish-card-wrap">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane v-for="c in categories" :key="c.id" :label="c.name" :name="String(c.id)" />
      </el-tabs>

      <el-row :gutter="12">
        <el-col v-for="dish in filteredDishes" :key="dish.id" :xs="12" :sm="8" :md="6" class="dish-col">
          <div class="dish-card">
            <div class="dish-name">{{ dish.name }}</div>
            <div class="dish-desc">{{ dish.description || '暂无描述' }}</div>
            <div class="dish-bottom">
              <span class="price">¥{{ Number(dish.price).toFixed(2) }}</span>
              <el-input-number
                :model-value="cart[dish.id]?.amount || 0"
                :min="0"
                size="small"
                @change="(v) => onCount(dish, v)"
              />
            </div>
          </div>
        </el-col>
      </el-row>
      <el-empty v-if="filteredDishes.length === 0" description="暂无在售菜品" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTables, getOnSaleDishes, getCategories, scanOrder } from '../api/modules'

const tables = ref([])
const dishes = ref([])
const categories = ref([])
const tableId = ref(null)
const activeTab = ref('all')
const submitting = ref(false)

// 购物车：dishId -> { dish, amount }
const cart = ref({})

const selectedTable = computed(() => tables.value.find((t) => t.id === tableId.value) || null)
const cartCount = computed(() =>
  Object.values(cart.value).reduce((sum, item) => sum + item.amount, 0)
)
const cartTotal = computed(() =>
  Object.values(cart.value).reduce((sum, item) => sum + item.amount * Number(item.dish.price), 0)
)
const canSubmit = computed(() => !!tableId.value && cartCount.value > 0 && !submitting.value)

const filteredDishes = computed(() => {
  if (activeTab.value === 'all') return dishes.value
  const catId = Number(activeTab.value)
  return dishes.value.filter((d) => d.categoryId === catId)
})

onMounted(async () => {
  try {
    const [tableList, dishList, catList] = await Promise.all([
      getTables().catch(() => []),
      getOnSaleDishes().catch(() => []),
      getCategories().catch(() => []),
    ])
    tables.value = tableList || []
    dishes.value = dishList || []
    categories.value = catList || []
  } catch {
    // 拦截器已提示
  }
})

const onCount = (dish, v) => {
  if (v <= 0) {
    delete cart.value[dish.id]
  } else {
    cart.value[dish.id] = { dish, amount: v }
  }
}

const onSubmit = async () => {
  const items = Object.values(cart.value).map(({ dish, amount }) => ({
    dishId: dish.id,
    amount,
  }))
  submitting.value = true
  try {
    // 员工代下单：不传 userId（订单归属桌台，金额由后端重算）
    const res = await scanOrder({ tableId: tableId.value, items })
    ElMessage.success(`下单成功：订单 #${res.id}，¥${Number(res.totalAmount).toFixed(2)}`)
    cart.value = {}
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.toolbar-card {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}

.table-tip {
  font-size: 13px;
}

.table-tip.free {
  color: #67c23a;
}

.table-tip.busy {
  color: #e6a23c;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-summary {
  font-size: 14px;
  color: #303133;
}

.dish-card-wrap {
  min-height: 400px;
}

.dish-col {
  margin-bottom: 12px;
}

.dish-card {
  border: 1px solid #e6e8eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dish-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.dish-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-bottom {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: 16px;
  color: #f56c6c;
  font-weight: 700;
}
</style>
