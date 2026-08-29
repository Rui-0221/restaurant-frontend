<template>
  <AuthShell title="登录点餐" description="登录后即可查看订单并继续点餐">
    <form class="auth-form" @submit.prevent="onLogin">
      <van-cell-group inset>
        <van-field
          ref="phoneInput"
          v-model="form.phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          inputmode="tel"
          maxlength="11"
          label="手机号"
          placeholder="如：13800000000…"
          :error-message="phoneError"
          @update:model-value="phoneError = ''"
        />
        <van-field
          ref="passwordInput"
          v-model="form.password"
          name="password"
          type="password"
          autocomplete="current-password"
          label="密码"
          placeholder="请输入密码…"
          :error-message="passwordError"
          @update:model-value="passwordError = ''"
        />
      </van-cell-group>

      <div class="actions">
        <p v-if="formError" class="form-error" role="alert" aria-live="polite">
          {{ formError }}
        </p>
        <van-button
          type="primary"
          block
          round
          native-type="submit"
          :loading="loading"
          :aria-busy="loading"
        >
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
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { loginAndLoadProfile } from '../services/customerSession'
import AuthShell from '../components/AuthShell.vue'
import { tableLandingPath } from '../router/tableRoutes'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const form = reactive({ phone: '', password: '' })
const loading = ref(false)
const phoneError = ref('')
const passwordError = ref('')
const formError = ref('')
const phoneInput = ref(null)
const passwordInput = ref(null)

const onLogin = async () => {
  phoneError.value = ''
  passwordError.value = ''
  formError.value = ''
  if (!/^1\d{10}$/.test(form.phone)) {
    phoneError.value = '请输入 11 位手机号'
    showToast('请输入正确的手机号')
    nextTick(() => phoneInput.value?.focus())
    return
  }
  if (!form.password) {
    passwordError.value = '请输入密码'
    showToast('请输入密码')
    nextTick(() => passwordInput.value?.focus())
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
    formError.value = '登录失败，请检查账号信息后重试'
  } finally {
    loading.value = false
  }
}

// 无回跳目标时：有桌台上下文回落地页重新判断，否则进菜单
const getDefaultRedirect = () => tableLandingPath(cartStore.tableId) || '/'

const goRegister = () =>
  router.push({ path: '/register', query: { redirect: route.query.redirect } })
</script>

<style scoped>
.auth-form {
  display: block;
}

.auth-form :deep(.van-cell-group) {
  overflow: hidden;
  border: 1px solid rgb(233 224 216 / 82%);
  border-radius: var(--radius-lg);
}

.auth-form :deep(.van-field) {
  min-height: 54px;
  align-items: center;
}

.actions {
  margin: var(--space-6) var(--space-4) 0;
}

.form-error {
  margin-bottom: var(--space-3);
  color: var(--status-danger);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
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
  color: var(--brand-dark);
  font: inherit;
  font-weight: 700;
}
</style>
