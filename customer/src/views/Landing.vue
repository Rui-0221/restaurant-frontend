<template>
  <div class="landing">
    <div class="hero">
      <div class="hero-content">
        <div class="logo">🍜</div>
        <h1>欢迎光临</h1>
        <p class="table-label">桌号</p>
        <div class="table-no">{{ tableId }}</div>
      </div>
    </div>

    <div class="panel">
      <!-- 未登录 -->
      <template v-if="!userStore.isLogin">
        <div class="tip">扫码点餐，美味即达</div>
        <van-empty description="登录后开始点餐" />
        <div class="actions">
          <van-button type="primary" block round @click="goLogin">立即登录</van-button>
          <van-button plain round block class="reg-btn" @click="goRegister">注册新账号</van-button>
        </div>
      </template>

      <!-- 查询中 -->
      <van-loading v-else-if="loading" class="loading" />

      <!-- 首次点餐 -->
      <template v-else-if="!activeOrder">
        <div class="mode-badge new">✨ 首次点餐</div>
        <div class="tip">本桌还没有订单，开始你的美食之旅吧</div>
        <div class="actions">
          <van-button type="primary" block round size="large" @click="goMenu">开始点餐</van-button>
        </div>
      </template>

      <!-- 加菜 -->
      <template v-else>
        <div class="mode-badge add">➕ 加菜模式</div>
        <div class="tip">
          本桌已有订单 #{{ activeOrder.id }}（{{ ORDER_STATUS_TEXT(activeOrder.status) }}），可继续加菜
        </div>
        <div class="order-summary card">
          <div class="sum-row">
            <span>已点菜品</span>
            <span>{{ activeOrder.details.length }} 种</span>
          </div>
          <div class="sum-row total">
            <span>当前合计</span>
            <span class="price">¥{{ Number(activeOrder.totalAmount).toFixed(2) }}</span>
          </div>
        </div>
        <div class="actions">
          <van-button type="primary" block round size="large" @click="goMenu">继续加菜</van-button>
        </div>
      </template>
    </div>

    <!-- 登录弹窗：扫码后未登录自动弹出 -->
    <van-popup v-model:show="showLogin" round closeable class="login-popup">
      <div class="login-title">🍜 登录后点餐</div>
      <div class="login-tip">请先登录，只有登录后才能点餐</div>
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
      <div class="login-actions">
        <van-button type="primary" block round :loading="logging" @click="onLogin">登 录</van-button>
        <div class="go-register" @click="goRegister">没有账号？去注册</div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../store/user'
import { useCartStore } from '../store/cart'
import { login, getMe } from '../api/user'
import { getTableActiveOrder } from '../api/order'
import { ORDER_STATUS_TEXT } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const tableId = route.params.tableId
const loading = ref(false)
const activeOrder = ref(null)

// 登录弹窗
const showLogin = ref(false)
const logging = ref(false)
const form = reactive({ phone: '', password: '' })

// 已登录后查询本桌活跃订单，决定「首次点餐」还是「加菜模式」
const loadActiveOrder = async () => {
  loading.value = true
  try {
    activeOrder.value = await getTableActiveOrder(tableId)
    if (activeOrder.value) {
      cartStore.setContext(tableId, 'add', activeOrder.value)
    }
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 先清空旧的加菜上下文，避免跨桌串单
  cartStore.setContext(tableId, 'new', null)
  if (userStore.isLogin) {
    loadActiveOrder()
  } else {
    showLogin.value = true // 未登录自动弹出登录窗
  }
})

const onLogin = async () => {
  if (!/^1\d{10}$/.test(form.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  if (!form.password) {
    showToast('请输入密码')
    return
  }
  logging.value = true
  try {
    // /users/login 返回裸 token 字符串，再拉 /users/me 补用户信息
    const token = await login({ phone: form.phone, password: form.password })
    const me = await getMe()
    userStore.setLogin(token, me)
    showToast('登录成功')
    showLogin.value = false
    loadActiveOrder()
  } catch {
    // 拦截器已提示
  } finally {
    logging.value = false
  }
}

const goMenu = () => router.push('/menu')
const goLogin = () => router.push({ path: '/login', query: { redirect: `/table/${tableId}` } })
const goRegister = () => {
  showLogin.value = false
  router.push({ path: '/register', query: { redirect: `/table/${tableId}` } })
}
</script>

<style scoped>
.landing {
  min-height: 100vh;
}

.hero {
  background: linear-gradient(160deg, #ff9a6c 0%, #ff5f3d 55%, #e54d2e 100%);
  color: #fff;
  padding: 56px 24px 72px;
  text-align: center;
  border-radius: 0 0 28px 28px;
}

.logo {
  font-size: 44px;
  margin-bottom: 8px;
}

.hero h1 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 4px;
}

.table-label {
  margin-top: 24px;
  font-size: 13px;
  opacity: 0.85;
  letter-spacing: 6px;
}

.table-no {
  font-size: 64px;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.panel {
  margin: -36px 16px 16px;
  background: #fff;
  border-radius: 16px;
  padding: 24px 16px 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.tip {
  text-align: center;
  color: var(--text-sub);
  font-size: 14px;
  margin-bottom: 8px;
}

.mode-badge {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.mode-badge.new {
  color: var(--brand-color);
}

.mode-badge.add {
  color: #1989fa;
}

.actions {
  margin-top: 16px;
}

.reg-btn {
  margin-top: 10px;
}

.order-summary {
  margin-top: 16px;
  padding: 14px 16px;
}

.sum-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: var(--text-sub);
  font-size: 14px;
}

.sum-row.total {
  border-top: 1px dashed #eee;
  margin-top: 6px;
  padding-top: 10px;
  color: var(--text-main);
  font-weight: 600;
}

.loading {
  display: block;
  margin: 40px auto;
}

/* 登录弹窗：居中、限宽，移动端不占满屏幕 */
.login-popup {
  width: min(320px, 85vw);
  padding: 24px 20px 20px;
  border-radius: 16px;
}

.login-title {
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.login-tip {
  text-align: center;
  color: var(--brand-color);
  font-size: 13px;
  margin: 6px 0 16px;
}

.login-actions {
  margin-top: 20px;
}

.go-register {
  text-align: center;
  margin-top: 14px;
  color: var(--brand-color);
  font-size: 14px;
}
</style>
