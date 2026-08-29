/**
 * 前端全链路 API 测试 —— 走两个 dev server 的 proxy，验证真实链路
 * 用法：node scripts/e2e-test.mjs（需先启动 customer:5173 / admin:5174 / backend:8080）
 * 配置：E2E_CUSTOMER_URL、E2E_ADMIN_URL、E2E_BACKEND_URL、E2E_*_USERNAME/PASSWORD、E2E_*_PHONE
 * 远程地址默认拒绝；必须显式设置 ALLOW_E2E_REMOTE=1 才会运行。
 * 自愈：若目标桌台残留活跃订单，先按角色流程清场再开始
 */
const CUSTOMER_ORIGIN = process.env.E2E_CUSTOMER_URL || 'http://localhost:5173'
const ADMIN_ORIGIN = process.env.E2E_ADMIN_URL || 'http://localhost:5174'
const BACKEND_ORIGIN = process.env.E2E_BACKEND_URL || 'http://localhost:8080'
const CUSTOMER = `${CUSTOMER_ORIGIN.replace(/\/$/, '')}/api`
const ADMIN = `${ADMIN_ORIGIN.replace(/\/$/, '')}/api`
const BACKEND_WS = BACKEND_ORIGIN.replace(/^http/, 'ws').replace(/\/$/, '')

const isLocalUrl = (value) => {
  const hostname = new URL(value).hostname
  return ['localhost', '127.0.0.1', '::1'].includes(hostname)
}

const configuredUrls = [CUSTOMER_ORIGIN, ADMIN_ORIGIN, BACKEND_ORIGIN]
if (configuredUrls.some((url) => !isLocalUrl(url)) && process.env.ALLOW_E2E_REMOTE !== '1') {
  console.error('E2E 已拒绝：远程地址必须显式设置 ALLOW_E2E_REMOTE=1。')
  process.exit(1)
}

async function ensureServicesAvailable() {
  const probes = [
    ['customer dev server', `${CUSTOMER}/dishes/on-sale`],
    ['admin dev server', `${ADMIN}/employees/login`],
    ['backend', `${BACKEND_ORIGIN.replace(/\/$/, '')}/dishes/on-sale`],
  ]
  const unavailable = []
  for (const [name, url] of probes) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000) })
    } catch {
      unavailable.push(name)
    }
  }
  if (unavailable.length) {
    console.log(`E2E 未运行：以下服务未启动：${unavailable.join('、')}`)
    console.log('启动前提：backend:8080、customer:5173、admin:5174，或通过 E2E_*_URL 指定地址。')
    process.exit(0)
  }
}

await ensureServicesAvailable()

let passed = 0
let failed = 0

function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`)
  } else {
    failed++
    console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`)
  }
}

async function api(base, path, { method = 'GET', token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { http: res.status, code: json.code, msg: json.msg, data: json.data }
}

// 建立 WS 连接，等待 onopen 完成握手，再等推送（最多 5s）
// 必须先等 onopen 再发下单请求，否则推送可能在握手完成前发出而错过
function openWs(token) {
  const ws = new WebSocket(`${BACKEND_WS}/ws/kitchen?token=${token}`)
  return new Promise((resolve) => {
    ws.onopen = () => resolve(ws)
    ws.onerror = () => resolve(null)
  })
}

function waitWsMessage(ws, expectTypes, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ type: 'TIMEOUT' }), timeoutMs)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (expectTypes.includes(data.type)) {
          clearTimeout(timer)
          resolve(data)
        }
      } catch {}
    }
  })
}

const PHONE = process.env.E2E_CUSTOMER_PHONE || '139' + String(Date.now()).slice(-8)
const SECOND_PHONE = process.env.E2E_SECOND_CUSTOMER_PHONE || '138' + String(Date.now()).slice(-8)
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '123456'
const CHEF_USERNAME = process.env.E2E_CHEF_USERNAME || 'chef'
const CHEF_PASSWORD = process.env.E2E_CHEF_PASSWORD || '123456'
const WAITER_USERNAME = process.env.E2E_WAITER_USERNAME || 'waiter'
const WAITER_PASSWORD = process.env.E2E_WAITER_PASSWORD || '123456'
const TABLE_ID = Number(process.env.E2E_TABLE_ID || 1)
const CONCURRENCY_TABLE_ID = Number(process.env.E2E_CONCURRENCY_TABLE_ID || 2)
const RACE_TABLE_ID = Number(process.env.E2E_RACE_TABLE_ID || 3)
const WAIT = 300 // WS 推送延迟

async function settleTable(tableId, adminToken, chefToken, waiterToken) {
  const active = await api(ADMIN, `/orders/table/${tableId}/active`, { token: adminToken })
  if (!active.data) return null
  const orderId = active.data.id
  const status = Number(active.data.status)
  if (status === 1) await api(ADMIN, `/orders/${orderId}/status?status=2`, { method: 'PUT', token: chefToken })
  if (status <= 2) await api(ADMIN, `/orders/${orderId}/status?status=3`, { method: 'PUT', token: waiterToken })
  if (status <= 3) await api(ADMIN, `/orders/${orderId}/status?status=4`, { method: 'PUT', token: waiterToken })
  if (status <= 4) await api(ADMIN, `/orders/${orderId}/status?status=5`, { method: 'PUT', token: waiterToken })
  return orderId
}

console.log('=== 1. 员工登录（清场工具）===')
const adminLogin = await api(ADMIN, '/employees/login', {
  method: 'POST',
  body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
})
const chefLogin = await api(ADMIN, '/employees/login', {
  method: 'POST',
  body: { username: CHEF_USERNAME, password: CHEF_PASSWORD },
})
const waiterLogin = await api(ADMIN, '/employees/login', {
  method: 'POST',
  body: { username: WAITER_USERNAME, password: WAITER_PASSWORD },
})
const adminToken = adminLogin.data?.token
const chefToken = chefLogin.data?.token
const waiterToken = waiterLogin.data?.token
check('三个角色登录成功', adminToken && chefToken && waiterToken)

// 自愈：清掉测试桌台残留的活跃订单（上一轮测试中断留下的）。
for (const tableId of [TABLE_ID, CONCURRENCY_TABLE_ID, RACE_TABLE_ID]) {
  const cleaned = await settleTable(tableId, adminToken, chefToken, waiterToken)
  if (cleaned) console.log(`  ↻ 桌${tableId}残留订单 #${cleaned}，已清场`)
}

console.log('=== 2. 顾客端（:5173 proxy）===')
console.log('--- 公开接口（无需 token）---')
const menu = await api(CUSTOMER, '/dishes/on-sale')
check('on-sale 公开可访问', menu.code === 1 && Array.isArray(menu.data), `共 ${menu.data?.length} 道菜`)
const cats = await api(CUSTOMER, '/categories')
check('categories 公开可访问（新白名单）', cats.code === 1 && Array.isArray(cats.data), `共 ${cats.data?.length} 个分类`)

console.log('--- 注册/登录 ---')
const reg = await api(CUSTOMER, '/users/register', { method: 'POST', body: { name: '测试顾客', phone: PHONE, password: 'test123456' } })
check('注册成功', reg.code === 1, reg.msg)
const login = await api(CUSTOMER, '/users/login', { method: 'POST', body: { phone: PHONE, password: 'test123456' } })
check('登录返回裸 token 字符串', login.code === 1 && typeof login.data === 'string' && login.data.length > 20)
const userToken = login.data
const reg2 = await api(CUSTOMER, '/users/register', {
  method: 'POST',
  body: { name: '并发顾客', phone: SECOND_PHONE, password: 'test123456' },
})
const login2 = await api(CUSTOMER, '/users/login', {
  method: 'POST',
  body: { phone: SECOND_PHONE, password: 'test123456' },
})
check('第二个并发顾客登录成功', (reg2.code === 1 || reg2.code === 0) && login2.code === 1)
const secondUserToken = login2.data

console.log('--- 同桌并发首次下单 ---')
const [concurrent1, concurrent2] = await Promise.all([
  api(CUSTOMER, '/orders/scan-order', {
    method: 'POST',
    token: userToken,
    body: { tableId: CONCURRENCY_TABLE_ID, items: [{ dishId: 1, amount: 1 }] },
  }),
  api(CUSTOMER, '/orders/scan-order', {
    method: 'POST',
    token: secondUserToken,
    body: { tableId: CONCURRENCY_TABLE_ID, items: [{ dishId: 1, amount: 1 }] },
  }),
])
check(
  '同桌并发首次下单归并为一个活跃订单',
  concurrent1.code === 1 && concurrent2.code === 1 && concurrent1.data?.id === concurrent2.data?.id,
  `订单 #${concurrent1.data?.id}`,
)
const concurrentActive = await api(CUSTOMER, `/orders/table/${CONCURRENCY_TABLE_ID}/active`, { token: userToken })
check(
  '并发下单最终只有一个活跃订单',
  concurrentActive.code === 1 && concurrentActive.data?.id === concurrent1.data?.id,
)
await settleTable(CONCURRENCY_TABLE_ID, adminToken, chefToken, waiterToken)

console.log('--- 首次点餐（含 WebSocket 通知）---')
const active0 = await api(CUSTOMER, `/orders/table/${TABLE_ID}/active`, { token: userToken })
check(`清场后桌${TABLE_ID}无活跃订单 → null`, active0.code === 1 && active0.data === null)

const wsNew = await openWs(chefToken)
check('后厨 WS 握手成功', !!wsNew)
const wsNewPromise = waitWsMessage(wsNew, ['NEW_ORDER'])
const scan1 = await api(CUSTOMER, '/orders/scan-order', {
  method: 'POST',
  token: userToken,
  body: { tableId: TABLE_ID, items: [{ dishId: 1, amount: 2 }, { dishId: 5, amount: 1 }] },
})
const orderId = scan1.data?.id
const priceDish1 = scan1.data?.details?.find((d) => d.dishId === 1)?.price
const expectTotal1 = Math.round((priceDish1 * 2 + 18.0) * 100) / 100
check('首次点餐创建订单', scan1.code === 1 && orderId, `订单 #${orderId}`)
check('金额后端重算正确', Math.abs(scan1.data.totalAmount - expectTotal1) < 0.001, `¥${scan1.data.totalAmount}`)
const wsNewMsg = await wsNewPromise
check('后厨屏收到 NEW_ORDER 推送', wsNewMsg.type === 'NEW_ORDER' && wsNewMsg.orderId === orderId, wsNewMsg.message)
await new Promise((r) => setTimeout(r, WAIT))

console.log('--- 加菜（含 WebSocket 通知）---')
const wsAddPromise = waitWsMessage(wsNew, ['ADD_ITEMS'])
const scan2 = await api(CUSTOMER, '/orders/scan-order', {
  method: 'POST',
  token: userToken,
  body: { tableId: TABLE_ID, items: [{ dishId: 6, amount: 2 }] },
})
check('加菜并入同一订单', scan2.code === 1 && scan2.data.id === orderId, `订单 #${scan2.data?.id}`)
check('加菜后总价累加', Math.abs(scan2.data.totalAmount - (expectTotal1 + 12.0)) < 0.001, `¥${scan2.data.totalAmount}`)
const wsAdd = await wsAddPromise
check('后厨屏收到 ADD_ITEMS 推送', wsAdd.type === 'ADD_ITEMS' && wsAdd.orderId === orderId, wsAdd.message)
await new Promise((r) => setTimeout(r, WAIT))

console.log('--- 查询活跃订单 ---')
const active1 = await api(CUSTOMER, '/orders/table/1/active', { token: userToken })
check('桌1活跃订单含明细', active1.code === 1 && active1.data?.id === orderId && active1.data.details?.length >= 3)
const occupiedTables = await api(ADMIN, '/tables', { token: waiterToken })
const occupiedTable1 = occupiedTables.data?.find((t) => t.id === TABLE_ID)
check('下单后桌1处于占用状态', occupiedTables.code === 1 && occupiedTable1?.status === 1)

const history = await api(CUSTOMER, '/orders/user/history', { token: userToken })
const historyOrder = history.data?.find((item) => item.id === orderId)
check('历史订单可按订单 ID 精确定位', history.code === 1 && historyOrder?.details?.length >= 3)

console.log('=== 3. 员工端（:5174 proxy）===')
console.log('--- 订单列表与详情 ---')
const orders = await api(ADMIN, '/orders?page=1&size=20', { token: waiterToken })
check('订单分页列表', orders.code === 1 && Array.isArray(orders.data?.list), `共 ${orders.data?.total} 单`)
const detail = await api(ADMIN, `/orders/${orderId}`, { token: waiterToken })
check('订单详情含明细（新 getById）', detail.code === 1 && Array.isArray(detail.data?.details) && detail.data.details.length >= 3, `${detail.data?.details?.length} 条明细`)

console.log('--- 角色权限流转 ---')
const chefTrans = await api(ADMIN, `/orders/${orderId}/status?status=2`, { method: 'PUT', token: chefToken })
check('后厨 1→2 开始制作', chefTrans.code === 1)
const chefBad = await api(ADMIN, `/orders/${orderId}/status?status=3`, { method: 'PUT', token: chefToken })
check('后厨不能上菜（后端拦截）', chefBad.code === 0, chefBad.msg)
const s3 = await api(ADMIN, `/orders/${orderId}/status?status=3`, { method: 'PUT', token: waiterToken })
const s4 = await api(ADMIN, `/orders/${orderId}/status?status=4`, { method: 'PUT', token: waiterToken })
check('服务员 2→3→4 上菜/用餐', s3.code === 1 && s4.code === 1)
const [checkout1, checkout2] = await Promise.all([
  api(ADMIN, `/orders/${orderId}/status?status=5`, { method: 'PUT', token: waiterToken }),
  api(ADMIN, `/orders/${orderId}/status?status=5`, { method: 'PUT', token: waiterToken }),
])
const checkoutSuccesses = [checkout1, checkout2].filter((result) => result.code === 1).length
check('并发结账只有一个成功', checkoutSuccesses === 1)
const staleCheckout = await api(ADMIN, `/orders/${orderId}/status?status=5`, { method: 'PUT', token: waiterToken })
check('过期状态操作被拒绝', staleCheckout.code === 0, staleCheckout.msg)

console.log('--- 加菜与结账并发 ---')
const raceCreate = await api(CUSTOMER, '/orders/scan-order', {
  method: 'POST',
  token: userToken,
  body: { tableId: RACE_TABLE_ID, items: [{ dishId: 1, amount: 1 }] },
})
const raceOrderId = raceCreate.data?.id
await api(ADMIN, `/orders/${raceOrderId}/status?status=2`, { method: 'PUT', token: chefToken })
await api(ADMIN, `/orders/${raceOrderId}/status?status=3`, { method: 'PUT', token: waiterToken })
await api(ADMIN, `/orders/${raceOrderId}/status?status=4`, { method: 'PUT', token: waiterToken })
const [raceAdd, raceCheckout] = await Promise.all([
  api(CUSTOMER, '/orders/scan-order', {
    method: 'POST',
    token: userToken,
    body: { tableId: RACE_TABLE_ID, items: [{ dishId: 6, amount: 1 }] },
  }),
  api(ADMIN, `/orders/${raceOrderId}/status?status=5`, { method: 'PUT', token: waiterToken }),
])
const raceDetail = await api(ADMIN, `/orders/${raceOrderId}`, { token: waiterToken })
const raceActive = await api(CUSTOMER, `/orders/table/${RACE_TABLE_ID}/active`, { token: userToken })
const raceAddWasAccepted = raceAdd.code === 1 && raceAdd.data?.id === raceOrderId
const raceAddWasRejected = raceAdd.code === 0
check(
  '加菜与结账并发只产生合法线性化结果',
  raceCheckout.code === 1 && (raceAddWasAccepted || raceAddWasRejected) && raceActive.data === null,
)
check(
  '终态订单不会被拒绝后的加菜新增明细',
  raceAddWasAccepted || !raceDetail.data?.details?.some((detail) => detail.dishId === 6),
)

console.log('--- 结账后桌台释放 ---')
const tables = await api(ADMIN, '/tables', { token: waiterToken })
const table1 = tables.data?.find((t) => t.id === TABLE_ID)
check('桌1已释放为空闲', tables.code === 1 && table1?.status === 0)

console.log('--- 管理员统计 ---')
const stat = await api(ADMIN, '/orders/statistics/today', { token: adminToken })
check('今日营业额统计', stat.code === 1 && Number(stat.data?.totalRevenue) >= expectTotal1 + 12.0, `¥${stat.data?.totalRevenue}`)

console.log(`\n结果：${passed} 通过，${failed} 失败`)
process.exit(failed ? 1 : 0)
