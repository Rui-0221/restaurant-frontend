/**
 * 前端全链路 API 测试 —— 走两个 dev server 的 proxy，验证真实链路
 * 用法：node scripts/e2e-test.mjs（需先启动 customer:5173 / admin:5174 / backend:8080）
 * 自愈：若目标桌台残留活跃订单，先按角色流程清场再开始
 */
const CUSTOMER = 'http://localhost:5173/api'
const ADMIN = 'http://localhost:5174/api'

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
  const ws = new WebSocket(`ws://localhost:8080/ws/kitchen?token=${token}`)
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

const PHONE = '139' + String(Date.now()).slice(-8) // 每次运行唯一手机号
const TABLE_ID = 1
const WAIT = 300 // WS 推送延迟

console.log('=== 1. 员工登录（清场工具）===')
const adminLogin = await api(ADMIN, '/employees/login', { method: 'POST', body: { username: 'admin', password: '123456' } })
const chefLogin = await api(ADMIN, '/employees/login', { method: 'POST', body: { username: 'chef', password: '123456' } })
const waiterLogin = await api(ADMIN, '/employees/login', { method: 'POST', body: { username: 'waiter', password: '123456' } })
const adminToken = adminLogin.data?.token
const chefToken = chefLogin.data?.token
const waiterToken = waiterLogin.data?.token
check('三个角色登录成功', adminToken && chefToken && waiterToken)

// 自愈：清掉桌台残留的活跃订单（上一轮测试中断留下的）
const cleanup = await api(ADMIN, `/orders/table/${TABLE_ID}/active`, { token: adminToken })
if (cleanup.data) {
  console.log(`  ↻ 桌${TABLE_ID}残留订单 #${cleanup.data.id}，按流程清场…`)
  const st = cleanup.data.status
  if (st === 1) await api(ADMIN, `/orders/${cleanup.data.id}/status?status=2`, { method: 'PUT', token: chefToken })
  await api(ADMIN, `/orders/${cleanup.data.id}/status?status=3`, { method: 'PUT', token: waiterToken })
  await api(ADMIN, `/orders/${cleanup.data.id}/status?status=4`, { method: 'PUT', token: waiterToken })
  await api(ADMIN, `/orders/${cleanup.data.id}/status?status=5`, { method: 'PUT', token: waiterToken })
  console.log('  ↻ 清场完成')
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

console.log('--- 首次点餐（含 WebSocket 通知）---')
const active0 = await api(CUSTOMER, '/orders/table/1/active', { token: userToken })
check('清场后桌1无活跃订单 → null', active0.code === 1 && active0.data === null)

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
const s5 = await api(ADMIN, `/orders/${orderId}/status?status=5`, { method: 'PUT', token: waiterToken })
check('服务员 4→5 结账', s5.code === 1)

console.log('--- 结账后桌台释放 ---')
const tables = await api(ADMIN, '/tables', { token: waiterToken })
const table1 = tables.data?.find((t) => t.id === TABLE_ID)
check('桌1已释放为空闲', tables.code === 1 && table1?.status === 0)

console.log('--- 管理员统计 ---')
const stat = await api(ADMIN, '/orders/statistics/today', { token: adminToken })
check('今日营业额统计', stat.code === 1 && Number(stat.data?.totalRevenue) >= expectTotal1 + 12.0, `¥${stat.data?.totalRevenue}`)

console.log(`\n结果：${passed} 通过，${failed} 失败`)
process.exit(failed ? 1 : 0)
