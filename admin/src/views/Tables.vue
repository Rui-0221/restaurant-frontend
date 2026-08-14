<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>桌台管理</h1>
        <p>查看桌台容量、订单进度并生成顾客点餐二维码</p>
      </div>
      <el-button :loading="loading" @click="load">刷新桌台</el-button>
    </div>

    <div class="toolbar">
      <span class="total-tip">共 {{ list.length }} 张桌台</span>
      <el-button v-if="auth.isAdmin" type="primary" :icon="Plus" @click="openForm()">
        新增桌台
      </el-button>
    </div>

    <div v-loading="loading" class="table-grid">
      <div
        v-for="t in tableCards"
        :key="t.id"
        class="table-card"
        :class="{ occupied: t.status === 1, warning: t.orderState.kind === 'warning' }"
      >
        <div class="card-top">
          <span class="table-name">{{ t.name }}</span>
          <el-tag :type="TABLE_STATUS[t.status]?.type" size="small" effect="dark">
            {{ TABLE_STATUS[t.status]?.label }}
          </el-tag>
        </div>
        <div class="card-mid">
          <span>容量 {{ t.capacity }} 人</span>
          <span class="table-id">#{{ t.id }}</span>
        </div>
        <div class="order-state" :class="t.orderState.kind">
          <span>{{ t.orderState.title }}</span>
          <span>{{ t.orderState.detail }}</span>
        </div>
        <div class="card-actions">
          <el-button size="small" @click="showQr(t)">二维码</el-button>
          <el-button v-if="auth.isAdmin" size="small" link type="primary" @click="openForm(t)">编辑</el-button>
          <el-button v-if="auth.isAdmin" size="small" link type="danger" @click="remove(t)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑桌台' : '新增桌台'" width="420px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="桌台名" required>
          <el-input v-model="form.name" placeholder="如：A1" />
        </el-form-item>
        <el-form-item label="容量" required>
          <el-input-number v-model="form.capacity" :min="1" :max="20" />
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
            <div>当前是通过 <b>localhost</b> 打开管理端的，手机扫了会在自己身上找这个地址，打不开。</div>
            <div class="qr-warning-how">
              改用局域网地址打开管理端：<br />
              ① 看终端里 Vite 启动输出的 Network 行（如 http://192.168.x.x:5174）<br />
              ② 用该地址重新打开管理端 → 再点「二维码」
            </div>
          </div>
        </template>
        <template v-else>
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="二维码" />
          <div class="qr-tip">手机扫描二维码（同一局域网）即可进入该桌点餐</div>
          <div class="qr-url">{{ qrUrl }}</div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
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

const dialogVisible = ref(false)
const saving = ref(false)
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
  if (row) {
    Object.assign(form, { id: row.id, name: row.name, capacity: row.capacity })
  } else {
    Object.assign(form, { id: null, name: '', capacity: 4 })
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.name || !form.capacity) {
    ElMessage.warning('请填写桌台名和容量')
    return
  }
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
  qrUrl.value = `${location.protocol}//${host}:5173/#/table/${row.id}`
  qrDataUrl.value = await QRCode.toDataURL(qrUrl.value, { width: 260, margin: 1 })
  qrVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.total-tip {
  color: var(--text-sub);
  font-size: 14px;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.table-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e8eaee;
  transition: box-shadow 0.2s;
}

.table-card:hover {
  box-shadow: 0 4px 16px rgba(0, 21, 41, 0.08);
}

.table-card.occupied {
  border-color: #f1c1b5;
  background: #fffaf8;
}

.table-card.warning {
  border-color: #ead6a2;
  background: #fffdf6;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-name {
  font-size: 18px;
  font-weight: 700;
}

.card-mid {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.table-id {
  color: #c0c4cc;
}

.order-state {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f4f7f5;
  color: #5b8e65;
  font-size: 12px;
}

.order-state span:last-child {
  color: var(--text-sub);
}

.order-state.active {
  background: #fff1ec;
  color: var(--brand-color);
}

.order-state.warning {
  background: #fff6df;
  color: #ad7c17;
}

.card-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.qr-box {
  text-align: center;
}

.qr-box img {
  width: 240px;
  height: 240px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-warning {
  background: #fdf0ec;
  border: 1px solid #f3d9d0;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.qr-warning-title {
  color: #f56c6c;
  font-weight: 600;
  margin-bottom: 8px;
}

.qr-warning-how {
  margin-top: 10px;
  color: #909399;
}

.qr-tip {
  color: #909399;
  font-size: 13px;
  margin: 10px 0 6px;
}

.qr-url {
  color: #c0c4cc;
  font-size: 12px;
  word-break: break-all;
}

@media (max-width: 768px) {
  .page-header,
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
