<template>
  <div class="page">
    <div class="toolbar">
      <span class="total-tip">共 {{ list.length }} 张桌台</span>
      <el-button v-if="auth.isAdmin" type="primary" :icon="Plus" @click="openForm()">
        新增桌台
      </el-button>
    </div>

    <div class="table-grid">
      <div v-for="t in list" :key="t.id" class="table-card" :class="{ occupied: t.status === 1 }">
        <div class="card-top">
          <span class="table-name">{{ t.name }}</span>
          <el-tag :type="TABLE_STATUS[t.status]?.type" size="small" effect="dark">
            {{ TABLE_STATUS[t.status]?.label }}
          </el-tag>
        </div>
        <div class="card-mid">
          <span>🪑 容量 {{ t.capacity }} 人</span>
          <span class="table-id">#{{ t.id }}</span>
        </div>
        <div class="card-actions">
          <el-button size="small" :type="t.status === 1 ? 'success' : 'danger'" @click="toggleStatus(t)">
            {{ t.status === 1 ? '清台' : '占用' }}
          </el-button>
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
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="二维码" />
        <div class="qr-tip">手机扫描二维码（同一局域网）即可进入该桌点餐</div>
        <div class="qr-url">{{ qrUrl }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import { getTables, addTable, updateTable, deleteTable, changeTableStatus } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { TABLE_STATUS } from '../utils/constants'

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: null, name: '', capacity: 4 })

const qrVisible = ref(false)
const qrTable = ref(null)
const qrDataUrl = ref('')
const qrUrl = ref('')

const load = async () => {
  loading.value = true
  try {
    list.value = (await getTables()) || []
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

// 手动改桌台状态（清台兜底），所有员工可操作
const toggleStatus = async (row) => {
  const target = row.status === 1 ? 0 : 1
  try {
    await changeTableStatus(row.id, target)
    ElMessage.success(target === 1 ? `桌台 ${row.name} 已占用` : `桌台 ${row.name} 已清台`)
    load()
  } catch {
    // 拦截器已提示（CAS 冲突等）
  }
}

// 二维码内容用当前访问地址（局域网 IP 时手机可直接扫码）
const showQr = async (row) => {
  qrTable.value = row
  qrUrl.value = `${location.origin}/#/table/${row.id}`
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

.total-tip {
  color: #909399;
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
  border-color: #f56c6c;
  background: #fef7f7;
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
  color: #909399;
  font-size: 13px;
}

.table-id {
  color: #c0c4cc;
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
</style>
