// 业务常量映射 —— 与后端状态枚举一一对应

export const ORDER_STATUS = {
  0: { label: '已取消', color: '#909399' },
  1: { label: '待制作', color: '#e6a23c' },
  2: { label: '制作中', color: '#409eff' },
  3: { label: '上菜', color: '#7ed321' },
  4: { label: '用餐中', color: '#1989fa' },
  5: { label: '已结账', color: '#909399' },
}

export const ORDER_STATUS_TEXT = (status) => ORDER_STATUS[status]?.label || '未知状态'

export const formatTime = (iso) => {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}
