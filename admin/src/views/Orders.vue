<template>
  <div class="page">
    <div class="page-card">
      <div class="toolbar">
        <span class="total-tip">共 {{ total }} 笔订单</span>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="订单号" width="90" />
        <el-table-column prop="tableId" label="桌号" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="ORDER_STATUS[row.status]?.type" effect="light">
              {{ ORDER_STATUS[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ Number(row.totalAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :total="total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="load"
          @size-change="onSizeChange"
        />
      </div>
    </div>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="`订单 #${current?.id || ''}`" size="440px">
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="桌号">{{ current.tableId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="ORDER_STATUS[current.status]?.type" size="small">
              {{ ORDER_STATUS[current.status]?.label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间" :span="2">
            {{ formatTime(current.createTime) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-title">菜品明细</div>
        <el-table :data="current.details" size="small" border>
          <el-table-column prop="dishName" label="菜品" />
          <el-table-column prop="amount" label="数量" width="70" />
          <el-table-column label="单价" width="90">
            <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
          </el-table-column>
        </el-table>

        <div class="total-line">
          合计：<span class="amount">¥{{ Number(current.totalAmount).toFixed(2) }}</span>
        </div>

        <!-- 按角色显隐的流转按钮（后端强校验） -->
        <div class="actions">
          <el-button
            v-for="act in availableActions"
            :key="act.to"
            :type="act.danger ? 'danger' : 'primary'"
            :loading="acting === act.to"
            @click="doAction(act)"
          >
            {{ act.label }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getOrders, getOrder, changeOrderStatus } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { ORDER_STATUS, STATUS_ACTIONS, formatTime } from '../utils/constants'

const auth = useAuthStore()
const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)

const drawerVisible = ref(false)
const current = ref(null)
const acting = ref(null)

const load = async () => {
  loading.value = true
  try {
    const res = await getOrders(page.value, size.value)
    list.value = res.list || []
    total.value = res.total || 0
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const onSizeChange = () => {
  page.value = 1
  load()
}

// 打开详情：拉取完整订单（含明细，已结账/已取消订单同样可看）
const openDetail = async (row) => {
  drawerVisible.value = true
  try {
    current.value = await getOrder(row.id)
  } catch {
    current.value = row // 失败时降级展示列表数据
  }
}

// 当前角色 + 当前状态 → 可执行的流转操作
const availableActions = computed(() => {
  if (!current.value) return []
  return (STATUS_ACTIONS[auth.role] || []).filter((a) => a.from === current.value.status)
})

const doAction = async (act) => {
  if (act.danger) {
    await ElMessageBox.confirm(`确定要取消订单 #${current.value.id} 吗？`, '提示', { type: 'warning' })
  }
  acting.value = act.to
  try {
    await changeOrderStatus(current.value.id, act.to)
    ElMessage.success(`已${act.label}`)
    drawerVisible.value = false
    load()
  } catch {
    // 拦截器已提示（如越权流转）
  } finally {
    acting.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.total-tip {
  color: #909399;
  font-size: 14px;
}

.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.detail-title {
  margin: 16px 0 8px;
  font-weight: 600;
  font-size: 14px;
}

.total-line {
  margin-top: 12px;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
