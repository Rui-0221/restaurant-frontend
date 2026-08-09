<template>
  <div class="page">
    <div class="page-card">
      <div class="toolbar">
        <span class="total-tip">共 {{ list.length }} 名员工</span>
        <div class="toolbar-right">
          <el-button :icon="Key" @click="pwdVisible = true">修改密码</el-button>
          <el-button type="primary" :icon="Plus" @click="openForm()">新增员工</el-button>
        </div>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="ROLES[row.role]?.type" size="small">{{ ROLES[row.role]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.id === auth.employeeId" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑员工' : '新增员工'" width="440px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码" required>
          <el-input v-model="form.password" type="password" placeholder="初始密码" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" style="width: 100%">
            <el-option :value="2" label="服务员" />
            <el-option :value="3" label="后厨" />
            <el-option :value="1" label="管理员" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="400px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="旧密码" required>
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="savePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Key } from '@element-plus/icons-vue'
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, changePassword } from '../api/modules'
import { useAuthStore } from '../store/auth'
import { ROLES } from '../utils/constants'

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: null, username: '', password: '', name: '', phone: '', role: 2, status: 1 })

const pwdVisible = ref(false)
const pwdSaving = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '' })

const load = async () => {
  loading.value = true
  try {
    list.value = (await getEmployees()) || []
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const openForm = (row) => {
  if (row) {
    Object.assign(form, {
      id: row.id,
      username: row.username,
      password: '',
      name: row.name,
      phone: row.phone,
      role: row.role,
      status: row.status,
    })
  } else {
    Object.assign(form, { id: null, username: '', password: '', name: '', phone: '', role: 2, status: 1 })
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.username || (!form.id && !form.password) || !form.name || !form.phone) {
    ElMessage.warning('请填写完整信息')
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await updateEmployee({
        id: form.id,
        username: form.username,
        name: form.name,
        phone: form.phone,
        role: form.role,
        status: form.status,
      })
    } else {
      await addEmployee(form)
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
  await ElMessageBox.confirm(`确定要删除员工「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteEmployee(row.id)
    ElMessage.success('删除成功')
    load()
  } catch {
    // 拦截器已提示
  }
}

const savePwd = async () => {
  if (pwdForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  pwdSaving.value = true
  try {
    await changePassword(pwdForm.oldPassword, pwdForm.newPassword)
    ElMessage.success('密码修改成功')
    pwdVisible.value = false
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
  } catch {
    // 拦截器已提示（旧密码错误等）
  } finally {
    pwdSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.total-tip {
  color: #909399;
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}
</style>
