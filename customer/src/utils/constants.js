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

// 与后端 ScanOrderDTO 保持一致，避免顾客完成选择后才收到参数校验错误。
export const ORDER_LIMITS = {
  maxKinds: 50,
  maxAmountPerDish: 99,
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export const formatTime = (iso) => {
  if (!iso) return '-'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '-' : dateTimeFormatter.format(date)
}
