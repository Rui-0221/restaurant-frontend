<template>
  <div class="login-page">
    <div class="login-box">
      <div class="brand">
        <div class="brand-icon">🍜</div>
        <h1>餐厅管理系统</h1>
        <p>扫码点餐 · 后厨协作 · 实时通知 · 收银结账</p>
      </div>

      <el-form :model="form" size="large" @keyup.enter="onLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="onLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="hint">演示账号：admin/123456（管理员）· waiter/123456（服务员）· chef/123456（后厨）</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth'
import { employeeLogin } from '../api/modules'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

const onLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    // 返回 {token, name}，角色从 JWT 解码
    const res = await employeeLogin({ username: form.username, password: form.password })
    auth.setLogin(res.token, res.name)
    ElMessage.success(`欢迎，${res.name}`)
    router.replace(route.query.redirect || '/dashboard')
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff9a6c 0%, #e54d2e 55%, #c93d20 100%);
}

.login-box {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px 28px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.brand {
  text-align: center;
  margin-bottom: 28px;
}

.brand-icon {
  font-size: 48px;
}

.brand h1 {
  font-size: 22px;
  margin: 8px 0 6px;
  color: #303133;
}

.brand p {
  font-size: 13px;
  color: #909399;
}

.login-btn {
  width: 100%;
}

.hint {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #b0b3b8;
  line-height: 1.8;
}
</style>
