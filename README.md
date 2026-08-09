# 🍽️ 在线餐饮管理平台 — 前端

> 配套 [restaurant-backend](https://github.com/Rui-0221/restaurant-backend)（Spring Boot 3.2 + MyBatis 扫码点餐后端）的双前端项目

## 项目结构

```
restaurant-frontend/
├── customer/     # 顾客点餐 H5（Vue3 + Vant）— 端口 5173
├── admin/        # 员工后台（Vue3 + Element Plus + ECharts）— 端口 5174
└── scripts/      # e2e-test.mjs 全链路 API 测试
```

## 快速开始

前置：后端已启动（`localhost:8080`，含 MySQL/Redis）。

```powershell
# 顾客端
cd customer
npm install
npm run dev            # http://localhost:5173

# 员工端（另开终端）
cd admin
npm install
npm run dev            # http://localhost:5174
```

两个应用的 Vite proxy 均将 `/api` 转发到 `http://localhost:8080`（rewrite 去掉 `/api` 前缀）。

> 两个 dev server 均配置了 `host: true`（监听局域网），手机与电脑连同一 Wi-Fi 即可访问。手机扫码打不开时，检查 **Windows 防火墙**是否放行 Node.js（首次启动会弹窗，需允许"专用网络"；或临时关闭防火墙验证）。

## 演示账号（种子数据）

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 服务员 | waiter | 123456 |
| 后厨 | chef | 123456 |

## 演示流程

1. **员工端** `http://localhost:5174` 登录 admin → 桌台管理 → 给桌台生成二维码
2. 手机（同一局域网）扫码 → 顾客端落地页 → 注册/登录 → 点餐
3. 员工端订单管理实时可见新订单；**后厨屏**（chef 登录，顶栏入口）收到 WebSocket 推送
4. 后厨「开始制作」→ 服务员「上菜 → 用餐中 → 结账」→ 桌台自动释放 → 工作台营业额更新
5. 同桌再次扫码 → 自动进入「加菜模式」
6. **服务员代点餐**：员工端「帮顾客点餐」页（服务员/管理员可见）选桌台 → 加菜 → 提交，无需顾客扫码（订单归属桌台，复用自动加菜逻辑）
7. **顾客「我的」页**：点餐页右上角入口——用户信息、当前桌台订单、历史订单（仅自己扫码下的单，代点单不归属顾客）、退出登录

## 关键设计

- **双 token 隔离**：顾客 token（`customer_token`）与员工 token（`employee_token`）分存 localStorage，两个应用互不干扰
- **金额全信后端**：下单只传 `{dishId, amount}`，展示金额一律用后端返回值
- **角色权限**：菜单项和订单流转按钮按 JWT 中解码的 role 显隐（后端强校验，前端仅 UI 层）
- **后厨屏**：原生 WebSocket 连 `/ws/kitchen?token=`（仅厨师 token 可连），收到 NEW_ORDER/ADD_ITEMS 推送 → 提示音 + 滚动播报 + 自动刷新；断线 3s 自动重连，另有 30s 兜底轮询
- **员工代点餐**：admin「帮顾客点餐」页为不会扫码的顾客代下单——选桌台 + 在售菜品加购 + 提交 `scan-order`（不传 userId，订单归属桌台，与顾客扫码走同一接口、同一加菜逻辑）

## 测试

```powershell
node scripts/e2e-test.mjs   # 走两个 dev server 的 proxy 全链路验证（22 项断言）
```

覆盖：公开菜单/分类白名单、注册登录、首次点餐（金额重算）、加菜并单、WS 推送、订单分页与详情、角色流转权限（后厨不能上菜、服务员拦截 1→2）、结账释放桌台、今日营业额。

## 对后端的两个必要适配（已合入后端）

1. `WebConfig`：`/categories` 加入员工拦截器白名单（顾客端菜单需要分类名，与 `/dishes/on-sale` 同属公开菜单信息）
2. `OrdersController`/`OrdersService`：新增 `getOrderDetail(id)` 返回含明细的 OrderVO（管理端订单详情需展示完整账单）
