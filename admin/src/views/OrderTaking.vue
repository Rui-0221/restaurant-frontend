<template>
  <div class="page order-taking">
    <div class="page-header">
      <div>
        <h1>帮顾客点餐</h1>
        <p>确认桌台订单状态后，为顾客创建订单或追加菜品</p>
      </div>
    </div>

    <!-- 顶部：桌台选择 + 提交栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="label">桌台</span>
          <el-select
            v-model="tableId"
            class="table-select"
            placeholder="请选择桌台"
            clearable
            :loading="contextLoading"
            @change="loadTableContext"
          >
            <el-option
              v-for="t in tables"
              :key="t.id"
              :label="`${t.name}（${t.status === 0 ? '空闲' : '占用'}）`"
              :value="t.id"
            />
          </el-select>
          <el-tag
            v-if="tableContext.message"
            class="table-tip"
            :type="contextTagType"
            effect="plain"
          >
            {{ tableContext.message }}
          </el-tag>
        </div>
        <div class="toolbar-right">
          <span v-if="cartCount > 0" class="cart-summary"
            >已选 {{ cartCount }} 份，预估 ¥{{ cartTotal.toFixed(2) }}</span
          >
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
        <el-col
          v-for="dish in filteredDishes"
          :key="dish.id"
          :xs="24"
          :sm="8"
          :md="6"
          class="dish-col"
        >
          <div class="dish-card">
            <div class="dish-name">{{ dish.name }}</div>
            <div class="dish-desc">{{ dish.description || '暂无描述' }}</div>
            <div class="dish-bottom">
              <span class="price">¥{{ Number(dish.price).toFixed(2) }}</span>
              <el-input-number
                :model-value="cart[dish.id]?.amount || 0"
                :min="0"
                :max="ORDER_LIMITS.maxAmountPerDish"
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
import {
  getTables,
  getOnSaleDishes,
  getCategories,
  getActiveOrderByTable,
  scanOrder,
} from '../api/modules'
import { resolveTableOrderContext } from '../services/tableOrderContext'
import { ORDER_LIMITS } from '../utils/constants'

const tables = ref([])
const dishes = ref([])
const categories = ref([])
const tableId = ref(null)
const activeTab = ref('all')
const submitting = ref(false)
const contextLoading = ref(false)
const tableContext = ref({ kind: '', message: '' })
let contextRequestId = 0

// 购物车：dishId -> { dish, amount }
const cart = ref({})

const selectedTable = computed(() => tables.value.find((t) => t.id === tableId.value) || null)
const cartCount = computed(() =>
  Object.values(cart.value).reduce((sum, item) => sum + item.amount, 0),
)
const cartTotal = computed(() =>
  Object.values(cart.value).reduce((sum, item) => sum + item.amount * Number(item.dish.price), 0),
)
const canSubmit = computed(
  () =>
    !!tableId.value &&
    cartCount.value > 0 &&
    !submitting.value &&
    !contextLoading.value &&
    !['error', 'inconsistent'].includes(tableContext.value.kind),
)
const contextTagType = computed(() => {
  if (tableContext.value.kind === 'free') return 'success'
  if (['busy', 'warning'].includes(tableContext.value.kind)) return 'warning'
  if (['error', 'inconsistent'].includes(tableContext.value.kind)) return 'danger'
  return 'info'
})

const filteredDishes = computed(() => {
  if (activeTab.value === 'all') return dishes.value
  const catId = Number(activeTab.value)
  return dishes.value.filter((d) => d.categoryId === catId)
})

const loadTables = async () => {
  try {
    tables.value = (await getTables()) || []
  } catch {
    // 拦截器已提示
  }
}

const loadTableContext = async (selectedId = tableId.value) => {
  const requestId = ++contextRequestId
  if (!selectedId) {
    contextLoading.value = false
    tableContext.value = { kind: '', message: '' }
    return
  }

  contextLoading.value = true
  tableContext.value = { kind: '', message: '正在查询该桌的活跃订单…' }
  try {
    const order = await getActiveOrderByTable(selectedId)
    if (requestId !== contextRequestId || selectedId !== tableId.value) return

    const table = tables.value.find((item) => item.id === selectedId)
    tableContext.value = resolveTableOrderContext(table, order)
  } catch {
    if (requestId === contextRequestId && selectedId === tableId.value) {
      tableContext.value = { kind: 'error', message: '无法确认桌台订单状态，请重试后再提交' }
    }
  } finally {
    if (requestId === contextRequestId) contextLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [dishList, catList] = await Promise.all([
      getOnSaleDishes().catch(() => []),
      getCategories().catch(() => []),
    ])
    dishes.value = dishList || []
    categories.value = catList || []
  } catch {
    // 拦截器已提示
  }
  await loadTables()
})

const onCount = (dish, v) => {
  const amount = Number(v)
  if (!Number.isInteger(amount) || amount < 0) {
    ElMessage.warning('菜品数量不合法')
    return
  }
  if (amount > ORDER_LIMITS.maxAmountPerDish) {
    ElMessage.warning(`单个菜品最多 ${ORDER_LIMITS.maxAmountPerDish} 份`)
    return
  }
  if (amount <= 0) {
    delete cart.value[dish.id]
  } else {
    if (!cart.value[dish.id] && Object.keys(cart.value).length >= ORDER_LIMITS.maxKinds) {
      ElMessage.warning(`一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品`)
      return
    }
    cart.value[dish.id] = { dish, amount }
  }
}

const onSubmit = async () => {
  const items = Object.values(cart.value).map(({ dish, amount }) => ({
    dishId: dish.id,
    amount,
  }))
  if (
    items.length === 0 ||
    items.length > ORDER_LIMITS.maxKinds ||
    items.some((item) => item.amount < 1 || item.amount > ORDER_LIMITS.maxAmountPerDish)
  ) {
    ElMessage.warning('菜品数量或种类数不符合要求')
    return
  }
  if (tableContext.value.kind === 'error') {
    ElMessage.warning('请先确认桌台订单状态')
    return
  }
  submitting.value = true
  try {
    // 后端在同一事务内按桌台的实时活跃订单决定创建或追加，避免前端状态过期导致误判。
    const res = await scanOrder({ tableId: tableId.value, items })
    ElMessage.success(`下单成功：订单 #${res.id}，¥${Number(res.totalAmount).toFixed(2)}`)
    cart.value = {}
    await Promise.all([loadTables(), loadTableContext(tableId.value)])
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
  border: 1px solid #edf0f2;
  border-radius: 12px;
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
  flex-wrap: wrap;
  gap: 12px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 650;
}

.page-header p {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 13px;
}

.table-select {
  width: 220px;
}

.label {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}

.table-tip {
  height: auto;
  max-width: 100%;
  white-space: normal;
  line-height: 1.45;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-summary {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 600;
}

.dish-card-wrap {
  min-height: 400px;
  border: 1px solid #edf0f2;
  border-radius: 12px;
}

.dish-col {
  margin-bottom: 12px;
}

.dish-card {
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dish-card:hover {
  border-color: #f0b29f;
  box-shadow: 0 5px 14px rgb(51 59 67 / 8%);
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

@media (max-width: 768px) {
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .table-select {
    width: 100%;
  }
}
</style>
