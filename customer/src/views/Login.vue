<template>
  <div class="auth-page">
    <div class="auth-hero">
      <div class="logo">🍜</div>
      <h2>登录</h2>
      <p class="auth-tip">登录后才能点餐</p>
    </div>

    <div class="auth-form">
      <van-cell-group inset>
        <van-field
          v-model="form.phone"
          type="tel"
          maxlength="11"
          label="手机号"
          placeholder="请输入手机号"
        />
        <van-field
          v-model="form.password"
          type="password"
          label="密码"
          placeholder="请输入密码"
        />
      </van-cell-group>

      <div class="actions">
        <van-button type="primary" block round :loading="loading" @click="onLogin">
          登 录
        </van-button>
        <div class="go-register" @click="goRegister">没有账号？去注册</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { setToken } from '../utils/storage'
import { login, getMe } from '../api/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const form = reactive({ phone: '', password: '' })
const loading = ref(false)

const onLogin = async () => {
  if (!/^1\d{10}$/.test(form.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  if (!form.password) {
    showToast('请输入密码')
    return
  }
  loading.value = true
  try {
    // 注意：/users/login 返回的是裸 token 字符串
    const token = await login({ phone: form.phone, password: form.password })
    setToken(token) // 先写入 token，getMe 请求才能携带 Authorization（否则后端 401）
    const me = await getMe()
    userStore.setLogin(token, me)
    showToast('登录成功')
    router.replace(route.query.redirect || getDefaultRedirect())
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

// 无回跳目标时：有桌台上下文回落地页重新判断，否则进菜单
const getDefaultRedirect = () => (cartStore.tableId ? `/table/${cartStore.tableId}` : '/menu')

const goRegister = () =>
  router.push({ path: '/register', query: { redirect: route.query.redirect } })
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #fff;
}

.auth-hero {
  background: linear-gradient(160deg, #ff9a6c 0%, #e54d2e 100%);
  color: #fff;
  padding: 56px 24px 40px;
  text-align: center;
}

.logo {
  font-size: 44px;
}

.auth-hero h2 {
  margin-top: 8px;
  font-size: 22px;
  letter-spacing: 2px;
}

.auth-tip {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.85;
}

.auth-form {
  margin-top: 32px;
}

.actions {
  margin: 32px 24px 0;
}

.go-register {
  text-align: center;
  margin-top: 20px;
  color: var(--brand-color);
  font-size: 14px;
}
</style>
