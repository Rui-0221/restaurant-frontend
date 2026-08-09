<template>
  <div class="auth-page">
    <div class="auth-hero">
      <div class="logo">🍜</div>
      <h2>注册</h2>
    </div>

    <div class="auth-form">
      <van-cell-group inset>
        <van-field v-model="form.name" label="昵称" placeholder="请输入昵称" />
        <van-field v-model="form.phone" type="tel" maxlength="11" label="手机号" placeholder="请输入手机号" />
        <van-field v-model="form.password" type="password" label="密码" placeholder="请输入密码（6位以上）" />
      </van-cell-group>

      <div class="actions">
        <van-button type="primary" block round :loading="loading" @click="onRegister">
          注册并登录
        </van-button>
        <div class="go-register" @click="goLogin">已有账号？去登录</div>
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
import { register, login, getMe } from '../api/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const form = reactive({ name: '', phone: '', password: '' })
const loading = ref(false)

const onRegister = async () => {
  if (!form.name) {
    showToast('请输入昵称')
    return
  }
  if (!/^1\d{10}$/.test(form.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  if (form.password.length < 6) {
    showToast('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    await register({
      name: form.name,
      phone: form.phone,
      password: form.password,
    })
    // 注册成功后自动登录
    const token = await login({ phone: form.phone, password: form.password })
    const me = await getMe()
    userStore.setLogin(token, me)
    showToast('注册成功')
    router.replace(route.query.redirect || (cartStore.tableId ? `/table/${cartStore.tableId}` : '/menu'))
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const goLogin = () => router.push({ path: '/login', query: { redirect: route.query.redirect } })
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
