<template>
  <div class="page">
    <PageHeader title="员工管理" subtitle="维护员工账号、角色与在职状态">
      <template #actions>
        <div class="header-actions">
          <el-button :icon="Key" @click="openPasswordDialog">修改密码</el-button>
          <el-button type="primary" :icon="Plus" @click="openForm()">新增员工</el-button>
        </div>
      </template>
    </PageHeader>

    <section class="page-card entity-panel" aria-labelledby="employee-list-title">
      <div class="toolbar">
        <div class="list-summary">
          <span class="summary-icon" aria-hidden="true"
            ><el-icon><UserFilled /></el-icon
          ></span>
          <div>
            <p class="panel-kicker">TEAM MEMBERS</p>
            <h2 id="employee-list-title">员工列表</h2>
            <span>共 {{ list.length }} 名员工</span>
          </div>
        </div>
        <el-tag type="success" effect="plain" round>
          启用 {{ list.filter((item) => item.status === 1).length }} 人
        </el-tag>
      </div>

      <div class="table-shell employee-table-shell">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="80">
            <template #default="{ row }"
              ><span class="entity-id">#{{ row.id }}</span></template
            >
          </el-table-column>
          <el-table-column prop="username" label="用户名" width="140" />
          <el-table-column prop="name" label="姓名" width="130">
            <template #default="{ row }"
              ><strong>{{ row.name }}</strong></template
            >
          </el-table-column>
          <el-table-column prop="phone" label="手机号" width="150" />
          <el-table-column label="角色" width="110">
            <template #default="{ row }">
              <el-tag :type="ROLES[row.role]?.type" size="small" round>
                {{ ROLES[row.role]?.label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" round>
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openForm(row)">编辑</el-button>
              <el-button
                link
                type="danger"
                :disabled="row.id === auth.employeeId"
                @click="remove(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑员工' : '新增员工'"
      width="min(500px, calc(100% - 24px))"
      append-to-body
    >
      <el-form :model="form" label-position="top" class="entity-form">
        <el-form-item label="用户名" for="employee-username" required>
          <el-input
            ref="employeeUsernameInput"
            id="employee-username"
            v-model="form.username"
            name="username"
            autocomplete="username"
            placeholder="请输入登录用户名…"
            spellcheck="false"
            aria-describedby="employee-form-error"
            :aria-invalid="Boolean(formError && !form.username)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item v-if="!form.id" label="初始密码" for="employee-password" required>
          <el-input
            ref="employeePasswordInput"
            id="employee-password"
            v-model="form.password"
            name="newPassword"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="至少 6 位…"
            aria-describedby="employee-form-error"
            :aria-invalid="Boolean(formError && !form.password)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="姓名" for="employee-name" required>
          <el-input
            ref="employeeNameInput"
            id="employee-name"
            v-model="form.name"
            name="name"
            autocomplete="name"
            placeholder="请输入真实姓名…"
            aria-describedby="employee-form-error"
            :aria-invalid="Boolean(formError && !form.name)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="手机号" for="employee-phone" required>
          <el-input
            ref="employeePhoneInput"
            id="employee-phone"
            v-model="form.phone"
            name="phone"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            maxlength="11"
            placeholder="如：13800000000…"
            aria-describedby="employee-form-error"
            :aria-invalid="Boolean(formError && !form.phone)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="角色" for="employee-role" required>
          <el-select
            id="employee-role"
            v-model="form.role"
            name="employeeRole"
            aria-label="员工角色"
            class="full-control"
          >
            <el-option :value="2" label="服务员" />
            <el-option :value="3" label="后厨" />
            <el-option :value="1" label="管理员" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" for="employee-status">
          <el-switch
            id="employee-status"
            v-model="form.status"
            name="employeeStatus"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="停用"
            aria-label="员工账号状态"
          />
        </el-form-item>
        <p v-if="formError" id="employee-form-error" class="form-error" role="alert">
          {{ formError }}
        </p>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="pwdVisible"
      title="修改密码"
      width="min(440px, calc(100% - 24px))"
      append-to-body
    >
      <el-form :model="pwdForm" label-position="top" class="entity-form">
        <el-form-item label="旧密码" for="current-password" required>
          <el-input
            ref="currentPasswordInput"
            id="current-password"
            v-model="pwdForm.oldPassword"
            name="currentPassword"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="请输入旧密码…"
            aria-describedby="password-form-error"
            @input="pwdFormError = ''"
          />
        </el-form-item>
        <el-form-item label="新密码" for="new-password" required>
          <el-input
            ref="newPasswordInput"
            id="new-password"
            v-model="pwdForm.newPassword"
            name="newPassword"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="至少 6 位…"
            aria-describedby="password-form-error"
            :aria-invalid="Boolean(pwdFormError)"
            @input="pwdFormError = ''"
          />
        </el-form-item>
        <p v-if="pwdFormError" id="password-form-error" class="form-error" role="alert">
          {{ pwdFormError }}
        </p>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="savePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Key, UserFilled } from '@element-plus/icons-vue'
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  changePassword,
} from '../api/modules'
import { useAuthStore } from '../store/auth'
import { ROLES } from '../utils/constants'
import PageHeader from '../components/PageHeader.vue'

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)
const formError = ref('')
const employeeUsernameInput = ref(null)
const employeePasswordInput = ref(null)
const employeeNameInput = ref(null)
const employeePhoneInput = ref(null)
const form = reactive({
  id: null,
  username: '',
  password: '',
  name: '',
  phone: '',
  role: 2,
  status: 1,
})

const pwdVisible = ref(false)
const pwdSaving = ref(false)
const pwdFormError = ref('')
const currentPasswordInput = ref(null)
const newPasswordInput = ref(null)
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
  formError.value = ''
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
    Object.assign(form, {
      id: null,
      username: '',
      password: '',
      name: '',
      phone: '',
      role: 2,
      status: 1,
    })
  }
  dialogVisible.value = true
}

const openPasswordDialog = () => {
  pwdFormError.value = ''
  pwdVisible.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.username || (!form.id && !form.password) || !form.name || !form.phone) {
    formError.value = '请填写完整的员工信息'
    ElMessage.warning('请填写完整信息')
    nextTick(() => {
      const firstInvalid = !form.username
        ? employeeUsernameInput.value
        : !form.id && !form.password
          ? employeePasswordInput.value
          : !form.name
            ? employeeNameInput.value
            : employeePhoneInput.value
      firstInvalid?.focus()
    })
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
    formError.value = '保存失败，请检查填写内容后重试'
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
  pwdFormError.value = ''
  if (pwdForm.newPassword.length < 6) {
    pwdFormError.value = '新密码至少需要 6 位'
    ElMessage.warning('新密码至少 6 位')
    nextTick(() => newPasswordInput.value?.focus())
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
    pwdFormError.value = '密码修改失败，请检查旧密码后重试'
    nextTick(() => currentPasswordInput.value?.focus())
  } finally {
    pwdSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.entity-panel {
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

.employee-table-shell {
  --table-min-width: 850px;
}

.entity-id {
  color: var(--text-sub);
  font-variant-numeric: tabular-nums;
}

.full-control {
  width: 100%;
}

.form-error {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgb(210 74 67 / 8%);
  color: var(--status-danger);
  font-size: 12px;
}

@media (max-width: 768px) {
  .header-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .toolbar {
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .header-actions {
    grid-template-columns: 1fr;
  }
}
</style>
