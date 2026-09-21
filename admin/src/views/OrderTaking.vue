<template>
  <div class="page order-taking">
    <PageHeader title="帮顾客点餐" subtitle="确认桌台订单状态后，为顾客创建订单或追加菜品" />

    <section class="context-panel" aria-labelledby="table-context-title">
      <div class="context-copy">
        <span class="panel-kicker">TABLE CONTEXT</span>
        <h2 id="table-context-title">先确认服务桌台</h2>
        <p>系统会核对桌台的实时订单，自动判断是创建新订单还是追加菜品。</p>
      </div>

      <div class="context-control">
        <label for="service-table">服务桌台</label>
        <el-select
          id="service-table"
          v-model="tableId"
          class="table-select"
          name="tableId"
          placeholder="请选择桌台…"
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
      </div>

      <div
        class="context-status"
        :class="tableContext.kind || 'idle'"
        role="status"
        aria-live="polite"
        :aria-busy="contextLoading"
      >
        <span class="context-dot" aria-hidden="true"></span>
        <div class="context-status-copy">
          <strong>{{ orderModeLabel }}</strong>
          <p>{{ tableContext.message || '选择桌台后，这里会显示订单核对结果。' }}</p>
        </div>
        <span v-if="selectedTable" class="table-capacity">
          {{ selectedTable.name }} · {{ selectedTable.capacity }} 人桌
        </span>
      </div>
    </section>

    <section class="catalog-panel" aria-labelledby="dish-catalog-title">
      <div class="panel-heading catalog-heading">
        <div>
          <span class="panel-kicker">DISH CATALOG</span>
          <h2 id="dish-catalog-title">选择菜品</h2>
        </div>
        <span class="selection-limit">
          最多 {{ ORDER_LIMITS.maxKinds }} 种，每种 {{ ORDER_LIMITS.maxAmountPerDish }} 份
        </span>
      </div>

      <el-tabs v-model="activeTab" class="category-tabs">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane v-for="c in categories" :key="c.id" :label="c.name" :name="String(c.id)" />
      </el-tabs>

      <div v-loading="catalogLoading" class="catalog-content" :aria-busy="catalogLoading">
        <div v-if="filteredDishes.length" class="dish-grid">
          <article v-for="dish in filteredDishes" :key="dish.id" class="dish-card">
            <div class="dish-media">
              <div class="dish-placeholder" aria-hidden="true">餐</div>
              <img
                v-if="dish.image"
                :src="dish.image"
                :alt="`${dish.name}菜品图片`"
                width="320"
                height="180"
                loading="lazy"
                decoding="async"
                @error="$event.currentTarget.classList.add('is-error')"
              />
            </div>
            <div class="dish-body">
              <div class="dish-copy">
                <h3>{{ dish.name }}</h3>
                <p>{{ dish.description || '清爽出品，欢迎品尝。' }}</p>
              </div>
              <div class="dish-bottom">
                <MoneyValue class="dish-price" :amount="dish.price" />
                <el-input-number
                  :model-value="cart[dish.id]?.amount || 0"
                  :name="`dish-${dish.id}-amount`"
                  :min="0"
                  :max="ORDER_LIMITS.maxAmountPerDish"
                  :aria-label="`${dish.name}数量`"
                  inputmode="numeric"
                  autocomplete="off"
                  @change="(v) => onCount(dish, v)"
                />
              </div>
            </div>
          </article>
        </div>
        <el-empty v-else-if="!catalogLoading" description="暂无在售菜品" />
      </div>
    </section>

    <aside class="submit-summary" aria-label="点餐提交摘要">
      <div class="summary-table">
        <span class="summary-label">当前服务</span>
        <strong>{{ selectedTable?.name || '尚未选择桌台' }}</strong>
      </div>
      <div class="summary-count">
        <span>已选 {{ cartCount }} 份</span>
        <small>{{ orderModeLabel }}</small>
      </div>
      <div class="summary-total">
        <span>预估金额</span>
        <MoneyValue :amount="cartTotal" />
      </div>
      <el-button
        type="primary"
        size="large"
        :disabled="!canSubmit"
        :loading="submitting"
        @click="onSubmit"
      >
        {{ submitActionLabel }}
      </el-button>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import MoneyValue from '../components/MoneyValue.vue'
import PageHeader from '../components/PageHeader.vue'
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
const catalogLoading = ref(true)
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
const orderModeLabel = computed(() => {
  if (!tableId.value) return '等待选择桌台'
  if (contextLoading.value) return '正在核对订单'
  if (tableContext.value.kind === 'busy') return '追加菜品模式'
  if (['error', 'inconsistent'].includes(tableContext.value.kind)) return '需要人工确认'
  return '新订单模式'
})
const submitActionLabel = computed(() =>
  tableContext.value.kind === 'busy' ? '确认追加菜品' : '确认提交订单',
)

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
  catalogLoading.value = true
  try {
    const [dishList, catList] = await Promise.all([
      getOnSaleDishes().catch(() => []),
      getCategories().catch(() => []),
    ])
    dishes.value = dishList || []
    categories.value = catList || []
  } catch {
    // 拦截器已提示
  } finally {
    catalogLoading.value = false
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
    ElMessage.success(`下单成功：订单 #${res.id}，${formatMoney(res.totalAmount)}`)
    cart.value = {}
    await Promise.all([loadTables(), loadTableContext(tableId.value)])
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatMoney = (value) => moneyFormatter.format(Number(value) || 0)
</script>

<style scoped>
.order-taking {
  padding-bottom: 112px;
}

.context-panel,
.catalog-panel,
.submit-summary {
  border: 1px solid rgb(233 224 216 / 88%);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.context-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
  gap: 20px 28px;
  margin-bottom: 18px;
  padding: 22px;
  border-radius: var(--radius-lg);
}

.context-copy h2 {
  margin-top: 5px;
  font-size: 21px;
}

.context-copy p {
  max-width: 620px;
  margin-top: 7px;
  color: var(--text-sub);
  font-size: 14px;
}

.context-control {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.context-control label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
}

.table-select {
  width: 100%;
}

.context-status {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 13px 15px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #faf7f3;
}

.context-status.free {
  border-color: rgb(57 136 102 / 28%);
  background: rgb(57 136 102 / 8%);
}

.context-status.busy,
.context-status.warning {
  border-color: rgb(196 122 34 / 30%);
  background: rgb(196 122 34 / 9%);
}

.context-status.error,
.context-status.inconsistent {
  border-color: rgb(210 74 67 / 30%);
  background: rgb(210 74 67 / 8%);
}

.context-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-neutral);
  box-shadow: 0 0 0 5px rgb(116 109 103 / 10%);
}

.free .context-dot {
  background: var(--status-success);
  box-shadow: 0 0 0 5px rgb(57 136 102 / 12%);
}

.busy .context-dot,
.warning .context-dot {
  background: var(--status-warning);
  box-shadow: 0 0 0 5px rgb(196 122 34 / 12%);
}

.error .context-dot,
.inconsistent .context-dot {
  background: var(--status-danger);
  box-shadow: 0 0 0 5px rgb(210 74 67 / 12%);
}

.context-status-copy {
  min-width: 0;
}

.context-status-copy strong {
  font-size: 14px;
}

.context-status-copy p {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 13px;
}

.table-capacity {
  flex: none;
  margin-left: auto;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 650;
}

.catalog-panel {
  min-height: 420px;
  padding: 22px;
  border-radius: var(--radius-lg);
}

.catalog-heading {
  align-items: center;
}

.selection-limit {
  color: var(--text-muted);
  font-size: 12px;
}

.category-tabs {
  margin-top: 10px;
}

.category-tabs :deep(.el-tabs__item) {
  min-height: var(--tap-target-min);
  font-weight: 650;
}

.catalog-content {
  min-height: 260px;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 16px;
}

.dish-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-strong);
  transition:
    border-color var(--motion-base) ease,
    transform var(--motion-base) ease,
    box-shadow var(--motion-base) ease;
}

.dish-card:hover {
  border-color: rgb(229 77 46 / 34%);
  box-shadow: 0 12px 28px rgb(87 58 39 / 10%);
  transform: translateY(-2px);
}

.dish-media {
  position: relative;
  display: grid;
  height: 144px;
  overflow: hidden;
  place-items: center;
  background: linear-gradient(145deg, #fff0e8, #f5dfd0);
}

.dish-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-media img.is-error {
  opacity: 0;
}

.dish-placeholder {
  display: grid;
  width: 56px;
  height: 56px;
  border: 1px solid rgb(229 77 46 / 18%);
  border-radius: 18px;
  background: rgb(255 253 250 / 72%);
  color: var(--brand-dark);
  font-family: serif;
  font-size: 24px;
  font-weight: 800;
  place-items: center;
  transform: rotate(-4deg);
}

.dish-body {
  display: flex;
  flex-direction: column;
  min-height: 154px;
  padding: 14px;
}

.dish-copy {
  flex: 1;
}

.dish-copy h3 {
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.35;
}

.dish-copy p {
  display: -webkit-box;
  margin-top: 5px;
  overflow: hidden;
  color: var(--text-sub);
  font-size: 12px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dish-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.dish-price {
  color: var(--brand-dark);
  font-size: 18px;
  font-weight: 800;
}

.dish-bottom :deep(.el-input-number) {
  width: 144px;
}

.submit-summary {
  position: sticky;
  z-index: 8;
  bottom: max(16px, env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto auto auto;
  align-items: center;
  gap: 22px;
  margin-top: 18px;
  padding: 13px 14px 13px 18px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-floating);
}

.summary-table,
.summary-count,
.summary-total {
  display: flex;
  flex-direction: column;
}

.summary-label,
.summary-total span,
.summary-count small {
  color: var(--text-sub);
  font-size: 11px;
}

.summary-table strong {
  margin-top: 2px;
  font-size: 16px;
}

.summary-count > span {
  font-size: 14px;
  font-weight: 700;
}

.summary-total :deep(.money-value) {
  color: var(--brand-dark);
  font-size: 20px;
  font-weight: 800;
}

.submit-summary :deep(.el-button) {
  min-width: 152px;
  min-height: var(--tap-target-min);
}

@media (max-width: 900px) {
  .context-panel {
    grid-template-columns: 1fr;
  }

  .context-status {
    grid-column: auto;
  }

  .submit-summary {
    grid-template-columns: 1fr auto auto;
  }

  .summary-count {
    display: none;
  }
}

@media (max-width: 600px) {
  .order-taking {
    padding-bottom: 90px;
  }

  .context-panel,
  .catalog-panel {
    padding: 16px;
  }

  .context-status {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .table-capacity {
    width: 100%;
    margin-left: 22px;
  }

  .catalog-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .dish-grid {
    grid-template-columns: 1fr;
  }

  .dish-card {
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr);
  }

  .dish-media {
    height: 100%;
    min-height: 170px;
  }

  .dish-body {
    min-height: 170px;
  }

  .dish-bottom {
    align-items: flex-start;
    flex-direction: column;
  }

  .submit-summary {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 12px;
  }

  .summary-total {
    display: none;
  }

  .submit-summary :deep(.el-button) {
    min-width: 132px;
  }
}

@media (max-width: 360px) {
  .dish-card {
    grid-template-columns: 80px minmax(0, 1fr);
  }

  .dish-body {
    padding: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dish-card:hover {
    transform: none;
  }
}
</style>
