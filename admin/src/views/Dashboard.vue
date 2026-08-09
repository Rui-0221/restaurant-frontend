<template>
  <div class="page">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="8">
        <div class="stat-card today">
          <div class="stat-icon">💰</div>
          <div>
            <div class="stat-label">今日营业额</div>
            <div class="stat-value">¥{{ revenue.toFixed(2) }}</div>
            <div class="stat-sub">{{ todayDate }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card tables">
          <div class="stat-icon">🪑</div>
          <div>
            <div class="stat-label">桌台概况</div>
            <div class="stat-value">
              <span class="free">{{ freeTables }}</span>
              <span class="stat-slash">/</span>
              <span class="occupied">{{ occupiedTables }}</span>
              <span class="stat-unit"> 空闲/占用</span>
            </div>
            <div class="stat-sub">共 {{ totalTables }} 张桌台</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card orders">
          <div class="stat-icon">📋</div>
          <div>
            <div class="stat-label">进行中订单</div>
            <div class="stat-value">{{ activeOrders }}</div>
            <div class="stat-sub">待制作 · 制作中 · 上菜 · 用餐中</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-card class="chart-card" shadow="never">
      <template #header>订单状态分布</template>
      <div ref="chartRef" class="chart"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getTodayStatistics, getOrders, getTables } from '../api/modules'
import { ORDER_STATUS } from '../utils/constants'

const revenue = ref(0)
const todayDate = ref('')
const tables = ref([])
const orderList = ref([])

const totalTables = computed(() => tables.value.length)
const freeTables = computed(() => tables.value.filter((t) => t.status === 0).length)
const occupiedTables = computed(() => tables.value.filter((t) => t.status === 1).length)
const activeOrders = computed(() => orderList.value.filter((o) => [1, 2, 3, 4].includes(o.status)).length)

const chartRef = ref(null)
let chart = null

const loadAll = async () => {
  const [stat, list, t] = await Promise.all([
    getTodayStatistics().catch(() => null),
    getOrders(1, 100).catch(() => null),
    getTables().catch(() => []),
  ])
  if (stat) {
    revenue.value = Number(stat.totalRevenue) || 0
    todayDate.value = stat.date || ''
  }
  orderList.value = list?.list || []
  tables.value = t || []
  renderChart()
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const statusCount = [1, 2, 3, 4, 5, 0].map((s) => ({
    name: ORDER_STATUS[s].label,
    value: orderList.value.filter((o) => o.status === s).length,
  }))
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle' },
    color: ['#e6a23c', '#409eff', '#7ed321', '#1989fa', '#909399', '#c0c4cc'],
    series: [
      {
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
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
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
  margin-bottom: 16px;
}

.stat-icon {
  font-size: 36px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  margin-top: 4px;
}

.today .stat-value {
  color: var(--brand-color);
}

.free {
  color: #67c23a;
}

.occupied {
  color: #f56c6c;
}

.stat-slash {
  color: #c0c4cc;
  margin: 0 4px;
}

.stat-unit {
  font-size: 14px;
  color: #909399;
  font-weight: 400;
}

.stat-sub {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.chart-card {
  margin-top: 4px;
}

.chart {
  height: 320px;
}
</style>
