<template>
  <div class="kitchen">
    <!-- 顶部栏 -->
    <div class="k-header">
      <div class="k-left">
        <span class="k-title">🍳 后厨工作台</span>
        <span class="k-dot" :class="{ online: wsConnected }"></span>
        <span class="k-status">{{ wsConnected ? '实时连接中' : '连接断开，重连中…' }}</span>
      </div>
      <div class="k-right">
        <span class="k-clock">{{ now }}</span>
        <el-button size="small" class="k-exit" @click="router.push('/dashboard')">返回后台</el-button>
      </div>
    </div>

    <!-- 通知滚动条 -->
    <div class="k-ticker">
      <span class="ticker-icon">🔔</span>
      <span v-if="notices.length" class="ticker-text" :key="notices[0].id">{{ notices[0].message }}</span>
      <span v-else class="ticker-text muted">等待新订单…</span>
    </div>

    <!-- 订单网格 -->
    <div v-loading="loading" class="k-grid">
      <div
        v-for="o in activeOrders"
        :key="o.id"
        class="k-card"
        :class="`st-${o.status}`"
      >
        <div class="k-card-head">
          <span class="k-table">桌 {{ o.tableId }}</span>
          <span class="k-status-tag">{{ ORDER_STATUS[o.status]?.label }}</span>
          <span class="k-time">{{ elapsed(o.createTime) }}</span>
        </div>
        <div class="k-items">
          <div v-for="d in o.details" :key="d.dishId" class="k-item">
            <span>{{ d.dishName }}</span>
            <span class="k-amount">×{{ d.amount }}</span>
          </div>
        </div>
        <div class="k-card-foot">
          <el-button v-if="o.status === 1" type="primary" size="small" @click="startCooking(o)">
            ▶ 开始制作
          </el-button>
          <span v-else class="k-total">¥{{ Number(o.totalAmount).toFixed(2) }}</span>
        </div>
      </div>
    </div>
    <div v-if="!loading && activeOrders.length === 0" class="k-empty">
      🎉 暂无进行中的订单
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../store/auth'
import { getOrders, changeOrderStatus } from '../api/modules'
import { ORDER_STATUS, formatTime } from '../utils/constants'

const router = useRouter()
const auth = useAuthStore()

const list = ref([])
const loading = ref(false)
const wsConnected = ref(false)
const notices = ref([])
const now = ref('')

// ---------- 订单数据 ----------
// 只看活跃订单（1 待制作 → 2 制作中 → 3 上菜 → 4 用餐中），按状态优先级 + 下单时间排队
const activeOrders = computed(() =>
  [...list.value]
    .filter((o) => [1, 2, 3, 4].includes(o.status))
    .sort((a, b) => a.status - b.status || new Date(a.createTime) - new Date(b.createTime))
)

const loadOrders = async () => {
  try {
    const res = await getOrders(1, 100)
    list.value = res.list || []
  } catch {
    // 拦截器已提示
  }
}

// 开始制作（后厨角色唯一操作）
const startCooking = async (o) => {
  try {
    await changeOrderStatus(o.id, 2)
    ElMessage.success(`订单 #${o.id} 开始制作`)
    loadOrders()
  } catch {
    // 拦截器已提示
  }
}

// ---------- WebSocket ----------
let ws = null
let reconnectTimer = null
let heartbeatTimer = null

const connectWs = () => {
  const token = auth.token
  if (!token) return
  // 后厨屏只需厨师 token（role=3），服务端握手校验
  ws = new WebSocket(`ws://${location.hostname}:8080/ws/kitchen?token=${token}`)

  ws.onopen = () => {
    wsConnected.value = true
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      // 新订单/加菜 → 滚动播报 + 提示音 + 刷新列表
      notices.value.unshift({ id: `${Date.now()}-${Math.random()}`, message: data.message || '新消息' })
      if (notices.value.length > 5) notices.value.pop()
      beep()
      loadOrders()
    } catch {
      // 忽略非 JSON 消息
    }
  }

  ws.onclose = () => {
    wsConnected.value = false
    scheduleReconnect()
  }

  ws.onerror = () => {
    ws.close()
  }
}

// 断线 3 秒后重连
const scheduleReconnect = () => {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    if (auth.isLogin) connectWs()
  }, 3000)
}

// 提示音（WebAudio，无需音频文件）
const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    setTimeout(() => ctx.close(), 500)
  } catch {
    // 浏览器不支持则静默
  }
}

// ---------- 时钟与时长 ----------
const elapsed = (createTime) => {
  if (!createTime) return ''
  const start = new Date(createTime)
  const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}

const tick = () => {
  const d = new Date()
  now.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

onMounted(() => {
  loadOrders()
  connectWs()
  tick()
  heartbeatTimer = setInterval(tick, 1000) // 每秒刷新时钟与经过时长
  setInterval(loadOrders, 30000) // 30s 兜底轮询，防消息丢失
})

onBeforeUnmount(() => {
  clearTimeout(reconnectTimer)
  clearInterval(heartbeatTimer)
  ws?.close()
})
</script>

<style scoped>
.kitchen {
  min-height: 100vh;
  background: linear-gradient(180deg, #14181f 0%, #1a2029 100%);
  color: #e8ecf1;
  padding: 14px 18px 24px;
}

.k-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.k-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.k-title {
  font-size: 22px;
  font-weight: 700;
}

.k-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
}

.k-dot.online {
  background: #67c23a;
  box-shadow: 0 0 8px rgba(103, 194, 58, 0.8);
}

.k-status {
  font-size: 13px;
  color: #8a93a3;
}

.k-clock {
  font-size: 26px;
  font-weight: 700;
  font-family: 'Consolas', monospace;
  color: #ffd666;
  margin-right: 14px;
}

.k-exit {
  background: transparent;
  color: #8a93a3;
  border-color: #3a4354;
}

/* 通知滚动条 */
.k-ticker {
  background: #232a35;
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.ticker-icon {
  font-size: 16px;
}

.ticker-text {
  font-size: 15px;
  color: #ffd666;
  white-space: nowrap;
  animation: slidein 0.3s ease;
}

.ticker-text.muted {
  color: #5a6474;
}

@keyframes slidein {
  from {
    transform: translateX(-12px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 订单卡片网格 */
.k-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.k-card {
  background: #232a35;
  border-radius: 12px;
  padding: 14px 16px;
  border-left: 5px solid #8a93a3;
}

.k-card.st-1 {
  border-left-color: #e6a23c; /* 待制作 */
}

.k-card.st-2 {
  border-left-color: #409eff; /* 制作中 */
}

.k-card.st-3 {
  border-left-color: #7ed321; /* 上菜 */
}

.k-card.st-4 {
  border-left-color: #1989fa; /* 用餐中 */
}

.k-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.k-table {
  font-size: 20px;
  font-weight: 700;
}

.k-status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #c8d0db;
}

.k-time {
  margin-left: auto;
  font-family: 'Consolas', monospace;
  color: #8a93a3;
}

.k-items {
  border-top: 1px dashed #3a4354;
  padding-top: 8px;
  margin-bottom: 10px;
}

.k-item {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 14px;
}

.k-amount {
  color: #8a93a3;
}

.k-card-foot {
  display: flex;
  justify-content: flex-end;
}

.k-total {
  color: #ffd666;
  font-weight: 600;
}

.k-empty {
  text-align: center;
  color: #5a6474;
  font-size: 18px;
  padding: 80px 0;
}
</style>
