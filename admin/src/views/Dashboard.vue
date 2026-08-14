<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>工作台</h1>
        <p>快速了解餐厅当前运营情况</p>
      </div>
      <el-tag type="info" effect="plain">订单状态统计基于最近 {{ orderSampleLimit }} 笔</el-tag>
    </div>

    <el-row :gutter="16">
      <el-col v-if="authStore.isAdmin" :xs="24" :sm="8">
        <div class="stat-card today">
          <div class="stat-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div>
            <div class="stat-label">今日营业额</div>
            <div class="stat-value">¥{{ revenue.toFixed(2) }}</div>
            <div class="stat-sub">{{ todayDate }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="authStore.isAdmin ? 8 : 12">
        <div class="stat-card tables">
          <div class="stat-icon">
            <el-icon><Grid /></el-icon>
          </div>
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
      <el-col :xs="24" :sm="authStore.isAdmin ? 8 : 12">
        <div class="stat-card orders">
          <div class="stat-icon">
            <el-icon><Tickets /></el-icon>
          </div>
          <div>
            <div class="stat-label">进行中订单</div>
            <div class="stat-value">{{ activeOrders }}</div>
            <div class="stat-sub">最近 {{ orderSampleLimit }} 笔中的进行中订单</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-card class="chart-card" shadow="never">
      <template #header>
        <div class="chart-header">
          <div>
            <h2>订单状态分布</h2>
            <p>仅统计最近 {{ orderSampleLimit }} 笔订单，不代表全量经营数据</p>
          </div>
        </div>
      </template>
      <div ref="chartRef" class="chart"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { Grid, Money, Tickets } from '@element-plus/icons-vue'
import { getTodayStatistics, getOrders, getTables } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { ORDER_STATUS } from '../utils/constants'

const authStore = useAuthStore()

const revenue = ref(0)
const todayDate = ref('')
const tables = ref([])
const orderList = ref([])
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
  min-height: 128px;
  border: 1px solid #edf0f2;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 14px rgb(45 54 63 / 5%);
  margin-bottom: 16px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fff2ed;
  color: var(--brand-color);
  font-size: 22px;
}

.tables .stat-icon {
  background: #edf6ff;
  color: #409eff;
}

.orders .stat-icon {
  background: #f2f8ef;
  color: #5f9c6b;
}

.stat-label {
  font-size: 13px;
  color: var(--text-sub);
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
  color: #9ca3ab;
  margin-top: 4px;
}

.chart-card {
  margin-top: 4px;
  border: 1px solid #edf0f2;
  border-radius: 12px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1,
.chart-header h2 {
  font-size: 18px;
  font-weight: 650;
}

.page-header p,
.chart-header p {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 13px;
}

.chart-header h2 {
  font-size: 16px;
}

.chart {
  height: 320px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }
}
</style>
