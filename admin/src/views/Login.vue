<template>
  <SkipLink target-id="login-form" label="跳至登录表单" />
  <main id="main-content" class="login-page" tabindex="-1" aria-labelledby="login-title">
    <div class="login-shell">
      <section class="brand-panel" aria-label="有味餐厅运营管理系统">
        <div class="brand-lockup">
          <div class="brand-icon" aria-hidden="true">🍜</div>
          <div>
            <p class="brand-name" translate="no">有味餐厅</p>
            <p class="brand-kicker" translate="no">RESTAURANT OPERATIONS</p>
          </div>
        </div>
        <div class="brand-message">
          <p class="eyebrow">高效协作，从容待客</p>
          <h1 id="login-title">让每一桌服务，都清晰可见</h1>
          <p>统一处理扫码点餐、后厨协作、实时通知与收银结账。</p>
        </div>
        <ul class="feature-list" aria-label="系统能力">
          <li><span aria-hidden="true">01</span>订单实时流转</li>
          <li><span aria-hidden="true">02</span>前厅后厨协作</li>
          <li><span aria-hidden="true">03</span>经营数据概览</li>
        </ul>
      </section>

      <section id="login-form" class="form-panel" tabindex="-1" aria-labelledby="form-title">
        <div class="form-heading">
          <p>欢迎回来</p>
          <h2 id="form-title">登录管理后台</h2>
          <span>请输入员工账号继续工作</span>
        </div>

        <el-form :model="form" label-position="top" size="large" @submit.prevent="onLogin">
          <el-form-item label="用户名" for="login-username">
            <el-input
              ref="usernameInput"
              id="login-username"
              v-model="form.username"
              name="username"
              autocomplete="username"
              inputmode="text"
              placeholder="请输入用户名…"
              :prefix-icon="User"
              aria-describedby="login-error"
              :aria-invalid="Boolean(validationMessage)"
              spellcheck="false"
              @input="clearValidation"
            />
          </el-form-item>
          <el-form-item label="密码" for="login-password">
            <el-input
              ref="passwordInput"
              id="login-password"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码…"
              show-password
              :prefix-icon="Lock"
              aria-describedby="login-error"
              :aria-invalid="Boolean(validationMessage)"
              @input="clearValidation"
            />
          </el-form-item>
          <p id="login-error" class="form-error" role="alert" aria-live="polite">
            {{ validationMessage }}
          </p>
          <el-button
            native-type="submit"
            type="primary"
            class="login-btn"
            :loading="loading"
            :aria-busy="loading"
          >
            登录
          </el-button>
        </el-form>

        <div v-if="isDev" class="hint">
          <strong>本地演示账号</strong>
          <span>admin / 123456 · waiter / 123456 · chef / 123456</span>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import SkipLink from '../components/SkipLink.vue'
import { useAuthStore } from '../store/auth'
import { employeeLogin } from '../api/modules'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const validationMessage = ref('')
const usernameInput = ref(null)
const passwordInput = ref(null)
const isDev = import.meta.env.DEV

const clearValidation = () => {
  validationMessage.value = ''
}

const onLogin = async () => {
  if (loading.value) return
  if (!form.username || !form.password) {
    validationMessage.value = '请输入用户名和密码'
    ElMessage.warning('请输入用户名和密码')
    nextTick(() => (form.username ? passwordInput.value : usernameInput.value)?.focus())
    return
  }
  validationMessage.value = ''
  loading.value = true
  try {
    // 返回 {token, name}，角色从 JWT 解码
    const res = await employeeLogin({ username: form.username, password: form.password })
    auth.setLogin(res.token, res.name)
    ElMessage.success(`欢迎，${res.name}`)
    router.replace(route.query.redirect || '/dashboard')
  } catch {
    // 拦截器已提示
    validationMessage.value = '登录失败，请检查账号和密码后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  overflow: auto;
  padding: 32px;
  background:
    radial-gradient(circle at 15% 10%, rgb(229 77 46 / 16%), transparent 28rem),
    radial-gradient(circle at 90% 85%, rgb(196 122 34 / 10%), transparent 24rem), var(--bg-page);
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(360px, 1.12fr) minmax(360px, 0.88fr);
  width: min(100%, 1040px);
  min-height: 610px;
  overflow: hidden;
  border: 1px solid rgb(233 224 216 / 84%);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: 0 26px 80px rgb(87 58 39 / 16%);
}

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 44px;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 12%), transparent 42%),
    linear-gradient(155deg, #c94b2f, var(--brand-dark) 55%, #8f2918);
  color: #fff;
}

.brand-panel::before,
.brand-panel::after {
  position: absolute;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 50%;
  content: '';
}

.brand-panel::before {
  top: -110px;
  right: -120px;
  width: 330px;
  height: 330px;
}

.brand-panel::after {
  right: 72px;
  bottom: -90px;
  width: 210px;
  height: 210px;
}

.brand-lockup {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  display: grid;
  width: 52px;
  height: 52px;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 14%);
  font-size: 27px;
  place-items: center;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-kicker {
  margin-top: 3px;
  font-size: 9px;
  letter-spacing: 1.7px;
  opacity: 0.66;
}

.brand-message {
  position: relative;
  z-index: 1;
  max-width: 440px;
}

.eyebrow {
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 3px;
  opacity: 0.82;
}

.brand-message h1 {
  max-width: 9em;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.22;
  letter-spacing: -1px;
  text-wrap: balance;
}

.brand-message > p:last-child {
  max-width: 32em;
  margin-top: 20px;
  font-size: 14px;
  line-height: 1.8;
  opacity: 0.82;
}

.feature-list {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 18px;
  padding: 0;
  list-style: none;
}

.feature-list li {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
}

.feature-list span {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.56;
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px 56px;
}

.form-heading {
  margin-bottom: 28px;
}

.form-heading > p {
  color: var(--brand-dark);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
}

.form-heading h2 {
  margin-top: 8px;
  color: var(--text-main);
  font-size: 28px;
  line-height: 1.3;
}

.form-heading span {
  display: block;
  margin-top: 8px;
  color: var(--text-sub);
  font-size: 14px;
}

.form-panel :deep(.el-form-item) {
  margin-bottom: 20px;
}

.form-panel :deep(.el-form-item__label) {
  color: var(--text-main);
  font-weight: 700;
}

.form-panel :deep(.el-input__wrapper) {
  min-height: 48px;
  border-radius: var(--radius-md);
  background: #fbf8f5;
  box-shadow: 0 0 0 1px var(--border-subtle) inset;
}

.form-panel :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--brand-color) inset,
    0 0 0 3px rgb(229 77 46 / 13%);
}

.form-error {
  min-height: 22px;
  margin: -8px 0 12px;
  color: var(--status-danger);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  min-height: 48px;
  border-radius: var(--radius-md);
  font-size: 15px;
  letter-spacing: 3px;
  box-shadow: 0 10px 22px rgb(229 77 46 / 22%);
}

.hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 22px;
  padding: 12px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--text-sub);
  font-size: 11px;
  line-height: 1.6;
}

.hint strong {
  color: var(--brand-dark);
  font-size: 12px;
}

@media (max-width: 820px) {
  .login-page {
    align-items: start;
    padding: 20px;
  }

  .login-shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .brand-panel {
    min-height: 245px;
    padding: 28px;
  }

  .brand-message h1 {
    max-width: 14em;
    font-size: 28px;
  }

  .brand-message > p:last-child,
  .feature-list {
    display: none;
  }

  .form-panel {
    padding: 34px 28px 30px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
    background: var(--surface);
  }

  .login-shell {
    min-height: 100vh;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .brand-panel {
    min-height: 224px;
    padding: calc(22px + env(safe-area-inset-top)) 22px 28px;
  }

  .brand-message h1 {
    font-size: 24px;
  }

  .form-panel {
    justify-content: flex-start;
    padding: 30px 22px calc(28px + env(safe-area-inset-bottom));
  }

  .form-heading h2 {
    font-size: 24px;
  }
}
</style>
