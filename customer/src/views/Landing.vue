<template>
  <main id="main-content" class="landing" tabindex="-1" aria-labelledby="landing-title">
    <header class="hero">
      <div class="hero-orb orb-one" aria-hidden="true" />
      <div class="hero-orb orb-two" aria-hidden="true" />
      <div class="brand-lockup">
        <div class="logo" aria-hidden="true">🍜</div>
        <div>
          <p class="brand-name" translate="no">有味餐厅</p>
          <p class="brand-slogan">扫码点餐 · 新鲜上桌</p>
        </div>
      </div>
      <div class="hero-copy">
        <p class="eyebrow">TABLE READY · 桌台已识别</p>
        <h1 id="landing-title">欢迎入座，慢慢享用</h1>
        <div class="table-number" aria-label="当前桌号">
          <span>桌号</span>
          <strong>{{ tableId }}</strong>
        </div>
      </div>
    </header>

    <section v-if="userStore.isLogin" class="panel" aria-label="点餐状态">
      <LoadingSkeleton v-if="loading" :count="1" />

      <template v-else-if="contextError">
        <div class="mode-icon warning" aria-hidden="true">!</div>
        <div class="mode-badge warning">暂时无法确认桌台状态</div>
        <p class="tip">购物车已经安全保留，请重试后再继续点餐。</p>
        <div class="actions">
          <van-button type="primary" block round size="large" @click="syncContext">重试</van-button>
        </div>
      </template>

      <template v-else-if="!activeOrder">
        <div class="mode-icon new" aria-hidden="true">✨</div>
        <div class="mode-badge new">首次点餐</div>
        <h2>准备好点餐了吗？</h2>
        <p class="tip">本桌还没有进行中的订单，去看看今天想吃什么。</p>
        <div class="actions">
          <van-button type="primary" block round size="large" @click="goMenu">开始点餐</van-button>
        </div>
      </template>

      <template v-else>
        <div class="mode-icon add" aria-hidden="true">＋</div>
        <div class="mode-badge add">加菜模式</div>
        <h2>本桌正在用餐</h2>
        <p class="tip">
          订单 #{{ activeOrder.id }} ·
          {{ ORDER_STATUS_TEXT(activeOrder.status) }}，可以继续追加菜品。
        </p>
        <div class="order-summary">
          <div class="sum-row">
            <span>已点菜品</span>
            <strong>{{ activeOrder.details.length }} 种</strong>
          </div>
          <div class="sum-row total">
            <span>当前合计</span>
            <MoneyText class="price" :amount="activeOrder.totalAmount" />
          </div>
        </div>
        <div class="actions">
          <van-button type="primary" block round size="large" @click="goMenu">继续加菜</van-button>
        </div>
      </template>
    </section>

    <van-popup
      v-model:show="showLogin"
      round
      closeable
      class="login-popup"
      aria-labelledby="landing-login-title"
    >
      <div class="popup-brand" aria-hidden="true">🍜</div>
      <h2 id="landing-login-title" class="login-title">登录后开始点餐</h2>
      <p class="login-tip">桌号 {{ tableId }} 已关联，登录后会回到当前桌台。</p>
      <form @submit.prevent="onLogin">
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
        <div class="login-actions">
          <p v-if="formError" class="form-error" role="alert" aria-live="polite">
            {{ formError }}
          </p>
          <van-button
            type="primary"
            block
            round
            native-type="submit"
            :loading="logging"
            :aria-busy="logging"
          >
            登录
          </van-button>
          <button type="button" class="go-register" @click="goRegister">没有账号？去注册</button>
        </div>
      </form>
    </van-popup>
  </main>
</template>

<script setup>
import { nextTick, reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { ORDER_STATUS_TEXT } from '../utils/constants'
import { loginAndLoadProfile } from '../services/customerSession'
import { synchronizeTableContext } from '../services/tableContext'
import { tableLandingPath, tableMenuPath } from '../router/tableRoutes'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import MoneyText from '../components/MoneyText.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const tableId = route.params.tableId
const loading = ref(false)
const activeOrder = ref(null)
const contextError = ref(null)

// 登录弹窗
const showLogin = ref(false)
const logging = ref(false)
const form = reactive({ phone: '', password: '' })
const phoneError = ref('')
const passwordError = ref('')
const formError = ref('')
const phoneInput = ref(null)
const passwordInput = ref(null)

// 以路由桌台为主来源，恢复购物车并查询最新活跃订单。
const syncContext = async () => {
  loading.value = true
  const result = await synchronizeTableContext(tableId, { cartStore })
  activeOrder.value = result.activeOrder
  contextError.value = result.error
  loading.value = false
}

onMounted(async () => {
  if (userStore.isLogin) {
    await syncContext()
  } else {
    cartStore.hydrateForTable(tableId)
    showLogin.value = true // 未登录自动弹出登录窗
  }
})

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
  logging.value = true
  try {
    const { token, userInfo } = await loginAndLoadProfile(form)
    userStore.setLogin(token, userInfo)
    showToast('登录成功')
    showLogin.value = false
    syncContext()
  } catch {
    // 拦截器已提示
    formError.value = '登录失败，请检查账号信息后重试'
  } finally {
    logging.value = false
  }
}

const goMenu = () => router.push(tableMenuPath(tableId))
const goRegister = () => {
  showLogin.value = false
  router.push({ path: '/register', query: { redirect: tableLandingPath(tableId) } })
}
</script>

<style scoped>
.landing {
  min-height: 100dvh;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  background: var(--bg-page);
}

.hero {
  position: relative;
  min-height: 350px;
  overflow: hidden;
  padding: calc(30px + env(safe-area-inset-top)) 24px 86px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 13%), transparent 44%),
    linear-gradient(155deg, #c94b2f, var(--brand-dark) 58%, #8f2918);
  color: #fff;
}

.hero-orb {
  position: absolute;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 50%;
  pointer-events: none;
}

.orb-one {
  top: -100px;
  right: -90px;
  width: 280px;
  height: 280px;
}

.orb-two {
  bottom: -80px;
  left: -70px;
  width: 190px;
  height: 190px;
}

.brand-lockup {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
}

.logo {
  display: grid;
  width: 46px;
  height: 46px;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: var(--radius-md);
  background: rgb(255 255 255 / 14%);
  font-size: 24px;
  place-items: center;
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 2px;
}

.brand-slogan {
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 1px;
  opacity: 0.75;
}

.hero-copy {
  position: relative;
  margin-top: 36px;
  text-align: center;
}

.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  opacity: 0.76;
}

.hero h1 {
  margin-top: 10px;
  font-size: clamp(26px, 8vw, 34px);
  line-height: 1.25;
  letter-spacing: -0.5px;
  text-wrap: balance;
}

.table-number {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 20px;
  padding: 8px 18px;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: var(--radius-xl);
  background: rgb(255 255 255 / 12%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 20%);
}

.table-number span {
  font-size: 12px;
  letter-spacing: 3px;
  opacity: 0.82;
}

.table-number strong {
  font-size: 34px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.panel {
  position: relative;
  z-index: 1;
  width: min(calc(100% - 32px), 520px);
  min-height: 250px;
  margin: -48px auto 0;
  padding: 28px 22px;
  border: 1px solid rgb(233 224 216 / 82%);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-floating);
  text-align: center;
}

.mode-icon {
  display: grid;
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: var(--radius-lg);
  font-size: 24px;
  place-items: center;
}

.mode-icon.new {
  background: var(--brand-light);
}

.mode-icon.add {
  background: rgb(53 120 200 / 11%);
  color: var(--status-info);
}

.mode-icon.warning {
  background: rgb(196 122 34 / 12%);
  color: var(--status-warning);
  font-weight: 800;
}

.mode-badge {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

.mode-badge.new {
  color: var(--brand-dark);
}

.mode-badge.add {
  color: var(--status-info);
}

.mode-badge.warning {
  color: var(--status-warning);
}

.panel h2 {
  margin-top: 8px;
  color: var(--text-main);
  font-size: 22px;
}

.tip {
  max-width: 30em;
  margin: 8px auto 0;
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.65;
}

.actions {
  margin-top: 22px;
}

.order-summary {
  margin-top: 18px;
  padding: 12px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #fbf8f5;
  text-align: left;
}

.sum-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.sum-row strong {
  color: var(--text-main);
}

.sum-row.total {
  margin-top: 5px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-subtle);
  color: var(--text-main);
  font-weight: 700;
}

.login-popup {
  width: min(360px, calc(100vw - 32px));
  padding: 28px 20px 22px;
  border-radius: var(--radius-xl);
}

.popup-brand {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: var(--radius-lg);
  background: var(--brand-light);
  font-size: 25px;
  place-items: center;
}

.login-title {
  color: var(--text-main);
  font-size: 20px;
  text-align: center;
}

.login-tip {
  margin: 6px auto 18px;
  color: var(--text-sub);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.login-popup :deep(.van-cell-group) {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.login-popup :deep(.van-field) {
  min-height: 54px;
  align-items: center;
}

.login-actions {
  margin-top: 20px;
}

.form-error {
  margin-bottom: 10px;
  color: var(--status-danger);
  font-size: 12px;
  text-align: center;
}

.go-register {
  display: block;
  min-height: var(--tap-target-min);
  margin: 8px auto 0;
  padding-inline: 10px;
  border: 0;
  background: transparent;
  color: var(--brand-dark);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

@media (min-width: 640px) {
  .landing {
    padding-top: 24px;
  }

  .hero {
    width: min(calc(100% - 48px), 640px);
    margin-inline: auto;
    border-radius: var(--radius-xl);
  }
}
</style>
