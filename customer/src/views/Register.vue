<template>
  <AuthShell title="创建账号" description="注册后即可保存订单记录并快速加菜">
    <form class="auth-form" @submit.prevent="onRegister">
      <van-cell-group inset>
        <van-field v-model="form.name" label="昵称" placeholder="请输入昵称" />
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
          placeholder="请输入密码（6位以上）"
        />
      </van-cell-group>

      <div class="actions">
        <van-button type="primary" block round native-type="submit" :loading="loading">
          注册并登录
        </van-button>
        <p class="auth-switch">已有账号？<button type="button" @click="goLogin">去登录</button></p>
      </div>
    </form>
  </AuthShell>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { register } from '../api/user'
import { loginAndLoadProfile } from '../services/customerSession'
import AuthShell from '../components/AuthShell.vue'

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
    const { token, userInfo } = await loginAndLoadProfile({
      phone: form.phone,
      password: form.password,
    })
    userStore.setLogin(token, userInfo)
    showToast('注册成功')
    router.replace(
      route.query.redirect || (cartStore.tableId ? `/table/${cartStore.tableId}` : '/menu'),
    )
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const goLogin = () => router.push({ path: '/login', query: { redirect: route.query.redirect } })
</script>

<style scoped>
.auth-form {
  display: block;
}

.actions {
  margin: var(--space-6) var(--space-4) 0;
}

.auth-switch {
  text-align: center;
  margin-top: var(--space-5);
  color: var(--text-sub);
  font-size: 14px;
}

.auth-switch button {
  min-height: var(--tap-target-min);
  padding: 0 var(--space-1);
  border: 0;
  background: transparent;
  color: var(--brand-color);
  font: inherit;
}
</style>
