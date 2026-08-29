<template>
  <div class="page" v-loading="loading">
    <PageHeader title="工作台" subtitle="快速了解餐厅当前的经营、桌台和订单状态">
      <template #actions>
        <el-tag type="info" effect="plain" round> 最近 {{ orderSampleLimit }} 笔订单样本 </el-tag>
      </template>
    </PageHeader>

    <section class="metrics-grid" aria-label="经营概况">
      <article v-if="authStore.isAdmin" class="metric-card revenue-card">
        <div class="metric-top">
          <div class="metric-icon">
            <el-icon><Money /></el-icon>
          </div>
          <span class="metric-badge">今日</span>
        </div>
        <p class="metric-label">今日营业额</p>
        <MoneyValue class="metric-value revenue" :amount="revenue" />
        <p class="metric-footnote">{{ todayDate || '暂无日期' }}</p>
      </article>

      <article class="metric-card table-card">
        <div class="metric-top">
          <div class="metric-icon">
            <el-icon><Grid /></el-icon>
          </div>
          <span class="metric-badge neutral">共 {{ totalTables }} 桌</span>
        </div>
        <p class="metric-label">桌台概况</p>
        <div class="metric-value split-value">
          <span class="free">{{ freeTables }}</span>
          <span class="divider">/</span>
          <span class="occupied">{{ occupiedTables }}</span>
        </div>
        <p class="metric-footnote">空闲 / 占用</p>
      </article>

      <article class="metric-card order-card">
        <div class="metric-top">
          <div class="metric-icon">
            <el-icon><Tickets /></el-icon>
          </div>
          <span class="metric-badge success">实时</span>
        </div>
        <p class="metric-label">进行中订单</p>
        <strong class="metric-value">{{ activeOrders }}</strong>
        <p class="metric-footnote">样本内待制作至用餐中订单</p>
      </article>
    </section>

    <section class="chart-card page-card" aria-labelledby="order-chart-title">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">ORDER OVERVIEW</p>
          <h2 id="order-chart-title">订单状态分布</h2>
          <p>统计最近 {{ orderSampleLimit }} 笔订单，用于快速观察当前节奏。</p>
        </div>
        <span class="chart-note">非全量经营数据</span>
      </div>
      <div
        ref="chartRef"
        class="chart"
        role="img"
        :aria-label="`最近 ${orderSampleLimit} 笔订单的状态分布图`"
      />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { Grid, Money, Tickets } from '@element-plus/icons-vue'
import { getTodayStatistics, getOrders, getTables } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { ORDER_STATUS } from '../utils/constants'
import PageHeader from '../components/PageHeader.vue'
import MoneyValue from '../components/MoneyValue.vue'

const authStore = useAuthStore()

const revenue = ref(0)
const todayDate = ref('')
const tables = ref([])
const orderList = ref([])
const loading = ref(false)
const orderSampleLimit = 100

const totalTables = computed(() => tables.value.length)
const freeTables = computed(() => tables.value.filter((t) => t.status === 0).length)
const occupiedTables = computed(() => tables.value.filter((t) => t.status === 1).length)
const activeOrders = computed(
  () => orderList.value.filter((o) => [1, 2, 3, 4].includes(o.status)).length,
)

const chartRef = ref(null)
let chart = null

const loadAll = async () => {
  loading.value = true
  try {
    const [stat, list, t] = await Promise.all([
      // 营业额仅管理员可见：非管理员不调用统计接口（后端也校验角色），避免报错提示
      authStore.isAdmin ? getTodayStatistics().catch(() => null) : Promise.resolve(null),
      getOrders(1, orderSampleLimit).catch(() => null),
      getTables().catch(() => []),
    ])
    if (stat) {
      revenue.value = Number(stat.totalRevenue) || 0
      todayDate.value = stat.date || ''
    }
    orderList.value = list?.list || []
    tables.value = t || []
    renderChart()
  } finally {
    loading.value = false
  }
}

const cssColor = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const statusCount = [1, 2, 3, 4, 5, 0].map((s) => ({
    name: ORDER_STATUS[s].label,
    value: orderList.value.filter((o) => o.status === s).length,
  }))
  const surfaceColor = cssColor('--surface', '#fffdfa')
  const textColor = cssColor('--text-sub', '#746d67')
  chart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: surfaceColor,
      borderColor: cssColor('--border-subtle', '#e9e0d8'),
      textStyle: { color: cssColor('--text-main', '#2d2926') },
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: { color: textColor },
    },
    color: [
      cssColor('--status-warning', '#c47a22'),
      cssColor('--status-info', '#3578c8'),
      cssColor('--brand-color', '#e54d2e'),
      cssColor('--status-success', '#398866'),
      cssColor('--status-neutral', '#746d67'),
      cssColor('--text-muted', '#9a918b'),
    ],
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: surfaceColor, borderWidth: 3 },
        label: { show: false },
        data: statusCount.filter((d) => d.value > 0),
      },
    ],
  })
}

const onResize = () => chart?.resize()

onMounted(() => {
  loadAll()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.metric-card {
  position: relative;
  min-height: 190px;
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgb(233 224 216 / 84%);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 100% 0%, rgb(229 77 46 / 8%), transparent 12rem), var(--surface);
  box-shadow: var(--shadow-card);
}

.metric-card::after {
  position: absolute;
  right: -44px;
  bottom: -70px;
  width: 150px;
  height: 150px;
  border: 1px solid rgb(229 77 46 / 7%);
  border-radius: 50%;
  content: '';
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-icon {
  display: grid;
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 22px;
  place-items: center;
}

.table-card .metric-icon {
  background: rgb(53 120 200 / 11%);
  color: var(--status-info);
}

.order-card .metric-icon {
  background: rgb(57 136 102 / 11%);
  color: var(--status-success);
}

.metric-badge {
  padding: 4px 9px;
  border-radius: var(--radius-xl);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 11px;
  font-weight: 700;
}

.metric-badge.neutral {
  background: #f2ede8;
  color: var(--text-sub);
}

.metric-badge.success {
  background: rgb(57 136 102 / 10%);
  color: var(--status-success);
}

.metric-label {
  margin-top: 20px;
  color: var(--text-sub);
  font-size: 13px;
}

.metric-value {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 30px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.metric-value.revenue {
  color: var(--brand-dark);
}

.split-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.free {
  color: var(--status-success);
}

.occupied {
  color: var(--status-danger);
}

.divider {
  color: var(--text-muted);
  font-size: 20px;
  font-weight: 400;
}

.metric-footnote {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.chart-card {
  padding: 22px;
  border-radius: var(--radius-lg);
}

.panel-heading p:last-child {
  margin-top: 5px;
  color: var(--text-sub);
  font-size: 12px;
}

.chart-note {
  color: var(--text-muted);
  font-size: 11px;
}

.chart {
  height: 340px;
  margin-top: 8px;
}

@media (max-width: 980px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metrics-grid .metric-card:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid .metric-card:last-child {
    grid-column: auto;
  }

  .metric-card {
    min-height: 176px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart {
    height: 300px;
  }
}
</style>
