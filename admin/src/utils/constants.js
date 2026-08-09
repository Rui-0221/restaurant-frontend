// 业务常量映射 —— 与后端状态枚举/角色定义一一对应

export const ORDER_STATUS = {
  0: { label: '已取消', type: 'info' },
  1: { label: '待制作', type: 'warning' },
  2: { label: '制作中', type: 'primary' },
  3: { label: '上菜', type: 'success' },
  4: { label: '用餐中', type: 'success' },
  5: { label: '已结账', type: 'info' },
}

export const TABLE_STATUS = {
  0: { label: '空闲', type: 'success' },
  1: { label: '占用', type: 'danger' },
}

export const ROLES = {
  1: { label: '管理员', type: 'danger' },
  2: { label: '服务员', type: 'warning' },
  3: { label: '后厨', type: 'primary' },
}

// 订单状态流转按钮矩阵：role(1 admin / 2 waiter / 3 chef) + 当前状态 → 可操作
// 后端强校验，这里只是控制 UI 显隐
export const STATUS_ACTIONS = {
  1: [ // 管理员：全部 + 取消
    { from: 1, to: 2, label: '开始制作' },
    { from: 2, to: 3, label: '上菜' },
    { from: 3, to: 4, label: '用餐中' },
    { from: 4, to: 5, label: '结账' },
    { from: 1, to: 0, label: '取消', danger: true },
    { from: 2, to: 0, label: '取消', danger: true },
    { from: 3, to: 0, label: '取消', danger: true },
    { from: 4, to: 0, label: '取消', danger: true },
  ],
  2: [ // 服务员：上菜 → 用餐中 → 结账
    { from: 2, to: 3, label: '上菜' },
    { from: 3, to: 4, label: '用餐中' },
    { from: 4, to: 5, label: '结账' },
  ],
  3: [ // 后厨：开始制作
    { from: 1, to: 2, label: '开始制作' },
  ],
}

export const formatTime = (iso) => {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}
