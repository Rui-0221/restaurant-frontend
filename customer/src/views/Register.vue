<template>
  <AuthShell title="创建账号" description="注册后即可保存订单记录并快速加菜">
    <form class="auth-form" @submit.prevent="onRegister">
      <van-cell-group inset>
        <van-field
          ref="nameInput"
          v-model="form.name"
          name="name"
          autocomplete="nickname"
          label="昵称"
          placeholder="如：小味…"
          :error-message="nameError"
          @update:model-value="nameError = ''"
        />
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
          autocomplete="new-password"
          label="密码"
          placeholder="请输入至少 6 位密码…"
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
          注册并登录
        </van-button>
        <p class="auth-switch">已有账号？<button type="button" @click="goLogin">去登录</button></p>
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
import { register } from '../api/user'
import { loginAndLoadProfile } from '../services/customerSession'
import AuthShell from '../components/AuthShell.vue'
import { tableLandingPath } from '../router/tableRoutes'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const form = reactive({ name: '', phone: '', password: '' })
const loading = ref(false)
const nameError = ref('')
const phoneError = ref('')
const passwordError = ref('')
const formError = ref('')
const nameInput = ref(null)
const phoneInput = ref(null)
const passwordInput = ref(null)

const onRegister = async () => {
  nameError.value = ''
  phoneError.value = ''
  passwordError.value = ''
  formError.value = ''
  if (!form.name) {
    nameError.value = '请输入昵称'
    showToast('请输入昵称')
    nextTick(() => nameInput.value?.focus())
    return
  }
  if (!/^1\d{10}$/.test(form.phone)) {
    phoneError.value = '请输入 11 位手机号'
    showToast('请输入正确的手机号')
    nextTick(() => phoneInput.value?.focus())
    return
  }
  if (form.password.length < 6) {
    passwordError.value = '密码至少需要 6 位'
    showToast('密码至少 6 位')
    nextTick(() => passwordInput.value?.focus())
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
    router.replace(route.query.redirect || tableLandingPath(cartStore.tableId) || '/')
  } catch {
    // 拦截器已提示
    formError.value = '注册失败，请检查填写内容后重试'
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
