<template>
  <div class="page">
    <PageHeader title="桌台管理" subtitle="查看桌台容量、订单进度并生成顾客点餐二维码">
      <template #actions>
        <el-button :loading="loading" @click="load">刷新桌台</el-button>
      </template>
    </PageHeader>

    <div class="table-overview" aria-label="桌台概况">
      <div class="overview-stats">
        <div class="overview-stat total">
          <span>全部桌台</span>
          <strong>{{ tableSummary.total }}</strong>
        </div>
        <div class="overview-stat free">
          <span>当前空闲</span>
          <strong>{{ tableSummary.free }}</strong>
        </div>
        <div class="overview-stat occupied">
          <span>正在服务</span>
          <strong>{{ tableSummary.occupied }}</strong>
        </div>
        <div class="overview-stat attention">
          <span>需要关注</span>
          <strong>{{ tableSummary.attention }}</strong>
        </div>
      </div>
      <el-button v-if="auth.isAdmin" type="primary" :icon="Plus" @click="openForm()">
        新增桌台
      </el-button>
    </div>

    <div v-loading="loading" class="table-grid">
      <article
        v-for="t in tableCards"
        :key="t.id"
        class="table-card"
        :class="[`status-${t.status}`, `order-${t.orderState.kind}`]"
      >
        <div class="card-top">
          <div class="table-identity">
            <span translate="no">TABLE #{{ t.id }}</span>
            <h2>{{ t.name }}</h2>
          </div>
          <el-tag :type="TABLE_STATUS[t.status]?.type" size="small" effect="dark">
            {{ TABLE_STATUS[t.status]?.label }}
          </el-tag>
        </div>
        <div class="card-mid">
          <span>建议就餐人数</span>
          <strong>{{ t.capacity }} 人</strong>
        </div>
        <div class="order-state" :class="t.orderState.kind" role="status">
          <span class="order-state-dot" aria-hidden="true"></span>
          <div>
            <strong>{{ t.orderState.title }}</strong>
            <span>{{ t.orderState.detail }}</span>
          </div>
        </div>
        <div class="card-actions">
          <el-button @click="showQr(t)">点餐二维码</el-button>
          <el-button v-if="auth.isAdmin" link type="primary" @click="openForm(t)">编辑</el-button>
          <el-button v-if="auth.isAdmin" link type="danger" @click="remove(t)">删除</el-button>
        </div>
      </article>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑桌台' : '新增桌台'" width="420px">
      <p class="dialog-intro">填写顾客能够清楚识别的桌台名称和建议就餐人数。</p>
      <el-form :model="form" label-position="top">
        <el-form-item label="桌台名" for="table-name" required :error="formError">
          <el-input
            ref="tableNameInput"
            id="table-name"
            v-model="form.name"
            name="tableName"
            autocomplete="off"
            placeholder="如：A1…"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="容量" for="table-capacity" required>
          <el-input-number
            ref="tableCapacityInput"
            id="table-capacity"
            v-model="form.capacity"
            name="tableCapacity"
            :min="1"
            :max="20"
            inputmode="numeric"
            autocomplete="off"
            aria-label="桌台容量"
          />
          <span class="field-hint">可设置 1 至 20 人</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrVisible" :title="`桌台 ${qrTable?.name || ''} 点餐二维码`" width="360px" align-center>
      <div class="qr-box">
        <template v-if="qrLocalOnly">
          <div class="qr-warning">
            <div class="qr-warning-title">⚠️ 无法生成手机可用的二维码</div>
            <div>
              当前是通过 <b translate="no">localhost</b>
              打开管理端的，手机扫了会在自己身上找这个地址，打不开。
            </div>
            <div class="qr-warning-how">
              改用局域网地址打开管理端：<br />
              ① 看终端里 Vite 启动输出的 Network 行（如 http://192.168.x.x:5174）<br />
              ② 用该地址重新打开管理端 → 再点「二维码」
            </div>
          </div>
        </template>
        <template v-else>
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="`${qrTable?.name || '桌台'}点餐二维码`"
            width="260"
            height="260"
            decoding="async"
          />
          <div class="qr-tip">手机扫描二维码（同一局域网）即可进入该桌点餐</div>
          <code class="qr-url" translate="no">{{ qrUrl }}</code>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import QRCode from 'qrcode'
import { getTables, addTable, updateTable, deleteTable, getActiveOrderByTable } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { TABLE_STATUS } from '../utils/constants'
import { describeTableCard } from '../services/tableCardState'

const auth = useAuthStore()
const list = ref([])
const activeOrders = ref({})
const loading = ref(false)

const tableCards = computed(() =>
  list.value.map((table) => ({
    ...table,
    orderState: describeTableCard(table, activeOrders.value[table.id]),
  })),
)
const tableSummary = computed(() => ({
  total: tableCards.value.length,
  free: tableCards.value.filter((table) => table.status === 0).length,
  occupied: tableCards.value.filter((table) => table.status === 1).length,
  attention: tableCards.value.filter((table) => table.orderState.kind === 'warning').length,
}))

const dialogVisible = ref(false)
const saving = ref(false)
const formError = ref('')
const tableNameInput = ref(null)
const tableCapacityInput = ref(null)
const form = reactive({ id: null, name: '', capacity: 4 })

const qrVisible = ref(false)
const qrTable = ref(null)
const qrDataUrl = ref('')
const qrUrl = ref('')
const qrLocalOnly = ref(false) // 通过 localhost 打开时手机不可访问，提示改用局域网地址

const load = async () => {
  loading.value = true
  try {
    const tables = (await getTables()) || []
    list.value = tables
    const activeOrderEntries = await Promise.all(
      tables.map(async (table) => {
        try {
          return [table.id, await getActiveOrderByTable(table.id)]
        } catch {
          return [table.id, null]
        }
      }),
    )
    activeOrders.value = Object.fromEntries(activeOrderEntries)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const openForm = (row) => {
  formError.value = ''
  if (row) {
    Object.assign(form, { id: row.id, name: row.name, capacity: row.capacity })
  } else {
    Object.assign(form, { id: null, name: '', capacity: 4 })
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.name || !form.capacity) {
    formError.value = form.name ? '' : '请输入桌台名称'
    ElMessage.warning('请填写桌台名和容量')
    nextTick(() => (form.name ? tableCapacityInput.value : tableNameInput.value)?.focus())
    return
  }
  formError.value = ''
  saving.value = true
  try {
    if (form.id) {
      await updateTable(form)
    } else {
      await addTable(form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

const remove = async (row) => {
  await ElMessageBox.confirm(`确定要删除桌台「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteTable(row.id)
    ElMessage.success('删除成功')
    load()
  } catch {
    // 拦截器已提示（如有活跃订单会拒绝）
  }
}

// 二维码指向顾客端（5173）：沿用当前 hostname（局域网 IP 时手机可直接扫码），
// 端口固定为顾客端，避免扫出来落在管理端（5174）而路由不存在
const showQr = async (row) => {
  qrTable.value = row
  // localhost/127.0.0.1 只在本机有效：手机扫码会在自己身上找服务 → 直接提示，不生成废码
  const host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    qrLocalOnly.value = true
    qrDataUrl.value = ''
    qrUrl.value = ''
    qrVisible.value = true
    return
  }
  qrLocalOnly.value = false
  const customerBase = import.meta.env.DEV ? `${location.protocol}//${host}:5173` : location.origin
  qrUrl.value = `${customerBase}/#/table/${row.id}`
  qrDataUrl.value = await QRCode.toDataURL(qrUrl.value, { width: 260, margin: 1 })
  qrVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.table-overview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid rgb(233 224 216 / 88%);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.overview-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.overview-stat {
  display: flex;
  align-items: baseline;
  gap: 9px;
  min-width: 116px;
  padding: 9px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #faf7f3;
}

.overview-stat span {
  color: var(--text-sub);
  font-size: 12px;
}

.overview-stat strong {
  margin-left: auto;
  color: var(--text-main);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.overview-stat.free {
  border-color: rgb(57 136 102 / 22%);
  background: rgb(57 136 102 / 7%);
}

.overview-stat.occupied {
  border-color: rgb(229 77 46 / 22%);
  background: var(--brand-light);
}

.overview-stat.attention {
  border-color: rgb(196 122 34 / 24%);
  background: rgb(196 122 34 / 8%);
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  min-height: 180px;
}

.table-card {
  position: relative;
  overflow: hidden;
  padding: 18px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition:
    border-color var(--motion-base) ease,
    box-shadow var(--motion-base) ease,
    transform var(--motion-base) ease;
}

.table-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--status-success);
  content: '';
}

.table-card:hover {
  border-color: rgb(229 77 46 / 24%);
  box-shadow: 0 14px 34px rgb(87 58 39 / 11%);
  transform: translateY(-2px);
}

.table-card.status-1::before {
  background: var(--brand-color);
}

.table-card.order-warning {
  border-color: rgb(196 122 34 / 36%);
  background: #fffaf0;
}

.table-card.order-warning::before {
  background: var(--status-warning);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.table-identity span {
  color: var(--brand-dark);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.table-identity h2 {
  margin-top: 3px;
  color: var(--text-main);
  font-size: 22px;
  line-height: 1.2;
}

.card-mid {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 18px 0 12px;
  padding: 0 2px;
  color: var(--text-sub);
  font-size: 13px;
}

.card-mid strong {
  color: var(--text-main);
  font-size: 18px;
}

.order-state {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  background: rgb(57 136 102 / 8%);
}

.order-state-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--status-success);
  box-shadow: 0 0 0 5px rgb(57 136 102 / 11%);
}

.order-state > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.order-state strong {
  color: var(--text-main);
  font-size: 13px;
}

.order-state > div span {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 12px;
}

.order-state.active {
  background: var(--brand-light);
}

.order-state.active .order-state-dot {
  background: var(--brand-color);
  box-shadow: 0 0 0 5px rgb(229 77 46 / 11%);
}

.order-state.warning {
  background: rgb(196 122 34 / 10%);
}

.order-state.warning .order-state-dot {
  background: var(--status-warning);
  box-shadow: 0 0 0 5px rgb(196 122 34 / 12%);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgb(233 224 216 / 72%);
}

.card-actions :deep(.el-button) {
  min-height: var(--tap-target-min);
}

.dialog-intro {
  margin: -4px 0 18px;
  color: var(--text-sub);
  font-size: 13px;
}

.field-hint {
  margin-left: 10px;
  color: var(--text-muted);
  font-size: 12px;
}

.qr-box {
  text-align: center;
}

.qr-box img {
  display: block;
  width: min(260px, 100%);
  height: auto;
  margin: 0 auto;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #fff;
}

.qr-warning {
  padding: 16px;
  border: 1px solid rgb(196 122 34 / 28%);
  border-radius: var(--radius-md);
  background: rgb(196 122 34 / 9%);
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.7;
  text-align: left;
}

.qr-warning-title {
  margin-bottom: 8px;
  color: var(--status-warning);
  font-weight: 700;
}

.qr-warning-how {
  margin-top: 10px;
  color: var(--text-sub);
}

.qr-tip {
  margin: 10px 0 6px;
  color: var(--text-sub);
  font-size: 13px;
}

.qr-url {
  display: block;
  max-height: 76px;
  overflow: auto;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: #f7f3ee;
  color: var(--text-sub);
  font-size: 12px;
  overflow-wrap: anywhere;
  text-align: left;
  white-space: normal;
}

@media (max-width: 768px) {
  .table-overview {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .overview-stat {
    min-width: 0;
  }

  .table-overview > :deep(.el-button) {
    width: 100%;
    min-height: var(--tap-target-min);
  }

  .table-grid {
    grid-template-columns: 1fr;
  }

  .field-hint {
    display: block;
    width: 100%;
    margin: 6px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .table-card:hover {
    transform: none;
  }
}
</style>
