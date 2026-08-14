<template>
  <AuthShell title="登录点餐" description="登录后即可查看订单并继续点餐">
    <form class="auth-form" @submit.prevent="onLogin">
      <van-cell-group inset>
        <van-field
          v-model="form.phone"
          type="tel"
          maxlength="11"
          label="手机号"
          placeholder="请输入手机号"
        />
        <van-field v-model="form.password" type="password" label="密码" placeholder="请输入密码" />
      </van-cell-group>

      <div class="actions">
        <van-button type="primary" block round native-type="submit" :loading="loading">
          登 录
        </van-button>
        <p class="auth-switch">
          还没有账号？<button type="button" @click="goRegister">去注册</button>
        </p>
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
import { loginAndLoadProfile } from '../services/customerSession'
import AuthShell from '../components/AuthShell.vue'

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
    const { token, userInfo } = await loginAndLoadProfile(form)
    userStore.setLogin(token, userInfo)
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
