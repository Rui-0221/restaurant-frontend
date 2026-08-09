# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

双前端 monorepo（非 git 仓库），配套 [restaurant-backend](https://github.com/)（Spring Boot 3.2 + MyBatis，默认 `localhost:8080`，含 MySQL/Redis）：

- `customer/` — 顾客扫码点餐 H5（Vue 3 + Vant 4 + Pinia + axios），端口 5173
- `admin/` — 员工后台（Vue 3 + Element Plus + ECharts + Pinia + axios），端口 5174
- `scripts/e2e-test.mjs` — 走两个 dev server proxy 的全链路 API 测试（22 项断言）

两个应用互相独立（各自 package.json / vite.config / localStorage key），但共享同一套业务语义与后端 API。**没有 lint 和单元测试配置**，唯一测试是 `scripts/e2e-test.mjs`。

## 常用命令

```powershell
# 顾客端（5173）
cd customer; npm install; npm run dev

# 员工端（5174，另开终端）
cd admin; npm install; npm run dev

# 生产构建 / 预览（各应用目录内）
npm run build
npm run preview

# 全链路测试（需两个 dev server + 后端 8080 均已启动）
node scripts/e2e-test.mjs
```

开发前需后端已启动。演示账号（种子数据）：admin / waiter / chef，密码均 `123456`。

## 架构要点

### 双 token 隔离
顾客 token 存 `customer_token` / `customer_user`，员工存 `employee_token` / `employee_name` / `employee_role` / `employee_id`（`utils/storage.js` 各一份，key 固定前缀隔离）。两个应用的 axios 拦截器各自读自己的 token，互不干扰。

### API 层约定（两个应用同构）
- axios 实例 `baseURL: '/api'`；Vite proxy 将 `/api/*` 转发到 `http://localhost:8080/*`（rewrite 去掉 `/api` 前缀）
- 请求拦截器自动附加 `Authorization: Bearer <token>`
- 响应拦截器解包后端 Result 信封 `{code, msg, data}`：`code === 1` 时**直接返回 `data`**（页面无需再解包）；其他 code 弹错误提示；HTTP 401 清 token 并跳登录页
- **金额全信后端**：下单只传 `{dishId, amount}`，展示金额一律用后端返回值，前端不做价格计算

### 角色与订单状态
- 角色：1 管理员 / 2 服务员 / 3 后厨。**后端强校验权限，前端仅 UI 层显隐**（`admin/src/utils/constants.js` 的 `STATUS_ACTIONS` 流转矩阵 + 路由 `meta.adminOnly` / `requiresRole`）
- 订单状态：0 已取消 / 1 待制作 / 2 制作中 / 3 上菜 / 4 用餐中 / 5 已结账。`admin/src/utils/constants.js` 与 `customer/src/utils/constants.js` 各有一份副本，改状态文案/映射需两边同步
- 员工 JWT payload：`{sub: employeeId, type: 'employee', role, exp}`；前端 `decodeJwt`（admin/src/utils/jwt.js）**仅解码不验签**，role 与 employeeId 在登录时从 payload 取出落 localStorage

### 顾客端点餐流程（扫码 → 下单）
- 扫码进 `/table/:tableId` 落地页（Landing.vue）→ 查 `/orders/table/:id/active` 决定「首次点餐」还是「加菜模式」
- `customer/src/store/cart.js` 持有点餐上下文（tableId / mode / activeOrder / items）；**Landing 挂载时先 `setContext(tableId, 'new', null)` 重置，防止跨桌串单**
- 首次与加菜都调同一个 `/orders/scan-order` 接口，后端按桌台决定新建或并入已有订单
- 路由守卫只保护 `cart` 页；登录/注册后按 `redirect` 或桌台上下文回跳

### 后厨屏（admin/src/views/Kitchen.vue）
- 原生 WebSocket **直连** `ws://localhost:8080/ws/kitchen?token=<token>`（不走 Vite proxy，服务端校验仅厨师 token）
- 收到 `NEW_ORDER` / `ADD_ITEMS` 推送 → 滚动播报 + WebAudio 提示音 + 刷新订单列表
- 断线 3s 自动重连，另有 30s 兜底轮询防消息丢失；只展示活跃订单（状态 1–4）

### 桌台二维码
`admin/src/views/Tables.vue` 用 `qrcode` 包生成含桌台 id 的落地页 URL。

## 测试自愈逻辑

`scripts/e2e-test.mjs` 开头自动清掉桌 1 残留的活跃订单再跑（查 `/orders/table/1/active`，按角色流程流转到已结账），跑中断后重跑无需手动清理。测试内每次运行用唯一手机号注册顾客。

## 对后端的既有适配（改动前端契约前先确认后端）

1. `WebConfig`：`/categories` 已加入员工拦截器白名单（顾客端菜单需要分类名）
2. `OrdersController` / `OrdersService`：已有 `getOrderDetail(id)` 返回含明细的 OrderVO（管理端订单详情展示完整账单）
