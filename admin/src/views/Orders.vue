<template>
  <div class="page">
    <PageHeader title="订单管理" subtitle="查看订单明细，并根据当前角色完成订单流转">
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新列表</el-button>
      </template>
    </PageHeader>

    <section class="page-card order-panel" aria-labelledby="order-list-title">
      <div class="toolbar">
        <div class="list-summary">
          <span class="summary-icon" aria-hidden="true"
            ><el-icon><Tickets /></el-icon
          ></span>
          <div>
            <p class="panel-kicker">ALL ORDERS</p>
            <h2 id="order-list-title">全部订单</h2>
            <span>当前共 {{ total }} 笔</span>
          </div>
        </div>
        <el-tag type="info" effect="plain" round>冲突时自动刷新最新状态</el-tag>
      </div>

      <div class="table-shell order-table-shell">
        <el-table :data="list" v-loading="loading" stripe class="order-table">
          <el-table-column prop="id" label="订单号" width="100">
            <template #default="{ row }">
              <span class="order-id">#{{ row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="tableId" label="桌号" width="90">
            <template #default="{ row }">
              <span class="table-number">{{ row.tableId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="金额" width="130">
            <template #default="{ row }">
              <MoneyValue class="amount" :amount="row.totalAmount" />
            </template>
          </el-table-column>
          <el-table-column label="下单时间" min-width="190">
            <template #default="{ row }">
              <DateTimeText :value="row.createTime" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pager" aria-label="订单分页">
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
    </section>

    <el-drawer
      v-model="drawerVisible"
      :title="`订单 #${current?.id || ''}`"
      size="min(520px, 100%)"
      append-to-body
    >
      <div v-if="current" v-loading="detailLoading" class="drawer-content">
        <div class="drawer-status">
          <div>
            <p class="panel-kicker">ORDER DETAIL</p>
            <h2>桌号 {{ current.tableId }}</h2>
          </div>
          <StatusTag :status="current.status" />
        </div>

        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="订单编号">#{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">
            <DateTimeText :value="current.createTime" />
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <StatusTag :status="current.status" size="small" />
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-title">
          <div>
            <p class="panel-kicker">DISHES</p>
            <h3>菜品明细</h3>
          </div>
          <span>{{ current.details?.length || 0 }} 种</span>
        </div>
        <div class="table-shell drawer-table-shell">
          <el-table :data="current.details" size="small">
            <el-table-column prop="dishName" label="菜品" min-width="150" />
            <el-table-column prop="amount" label="数量" width="70" />
            <el-table-column label="单价" width="110">
              <template #default="{ row }">
                <MoneyValue :amount="row.price" />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="total-line">
          <span>订单合计</span>
          <MoneyValue class="amount" :amount="current.totalAmount" />
        </div>

        <div v-if="availableActions.length" class="actions" aria-label="订单操作">
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
        <p v-else class="no-actions">当前状态没有可执行操作</p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Tickets } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import StatusTag from '../components/StatusTag.vue'
import MoneyValue from '../components/MoneyValue.vue'
import DateTimeText from '../components/DateTimeText.vue'
import { getOrders, getOrder, changeOrderStatus } from '../api/modules'
import { recoverOrderState } from '../services/orderState'
import { useAuthStore } from '../store/auth'
import { STATUS_ACTIONS } from '../utils/constants'

const auth = useAuthStore()
const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)

const drawerVisible = ref(false)
const current = ref(null)
const acting = ref(null)
const detailLoading = ref(false)

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
  detailLoading.value = true
  try {
    current.value = await getOrder(row.id)
  } catch {
    current.value = row // 失败时降级展示列表数据
  } finally {
    detailLoading.value = false
  }
}

// 当前角色 + 当前状态 → 可执行的流转操作
const availableActions = computed(() => {
  if (!current.value) return []
  return (STATUS_ACTIONS[auth.role] || []).filter((a) => a.from === current.value.status)
})

const refreshAfterActionFailure = async (orderId) => {
  try {
    current.value = await recoverOrderState(orderId, { loadOrders: load, getOrder })
    ElMessage.warning('订单状态已发生变化，页面已刷新为最新状态')
  } catch {
    current.value = null
    drawerVisible.value = false
  }
}

const doAction = async (act) => {
  if (act.danger) {
    try {
      await ElMessageBox.confirm(`确定要取消订单 #${current.value.id} 吗？`, '提示', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  const orderId = current.value.id
  acting.value = act.to
  try {
    await changeOrderStatus(orderId, act.to)
    ElMessage.success(`已${act.label}`)
    drawerVisible.value = false
    load()
  } catch {
    // 拦截器已提示（如 CAS 冲突）；刷新后按服务器最新状态重新计算可操作按钮。
    await refreshAfterActionFailure(orderId)
  } finally {
    acting.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.order-panel {
  border-radius: var(--radius-lg);
}

.list-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 20px;
  place-items: center;
}

.list-summary h2 {
  margin-top: 2px;
  color: var(--text-main);
  font-size: 17px;
}

.list-summary div > span {
  color: var(--text-sub);
  font-size: 11px;
}

.order-table-shell {
  --table-min-width: 760px;
}

.order-id {
  color: var(--text-main);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.table-number {
  display: inline-grid;
  min-width: 32px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: #f4eee8;
  color: var(--text-main);
  font-weight: 800;
  place-items: center;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.drawer-content {
  padding-bottom: 20px;
}

.drawer-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 100% 0%, rgb(229 77 46 / 9%), transparent 10rem), var(--brand-soft);
}

.drawer-status h2 {
  margin-top: 4px;
  font-size: 22px;
}

.detail-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin: 22px 0 10px;
}

.detail-title h3 {
  margin-top: 3px;
  font-size: 16px;
}

.detail-title > span {
  color: var(--text-muted);
  font-size: 11px;
}

.drawer-table-shell {
  --table-min-width: 400px;
}

.total-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: #fbf7f3;
  font-size: 14px;
  font-weight: 700;
}

.total-line .amount {
  font-size: 22px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.actions .el-button {
  min-height: var(--tap-target-min);
}

.no-actions {
  margin-top: 18px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: #f4eee8;
  color: var(--text-sub);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .toolbar {
    align-items: flex-start;
  }

  .pager {
    justify-content: flex-start;
  }
}
</style>
