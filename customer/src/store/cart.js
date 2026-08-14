import { defineStore } from 'pinia'
import { ORDER_LIMITS } from '../utils/constants.js'

// 购物车 + 点餐上下文（桌台、首次/加菜模式）
export const useCartStore = defineStore('cart', {
  state: () => ({
    tableId: null, // 当前桌台 ID
    mode: 'new', // 'new' 首次点餐 | 'add' 加菜
    activeOrder: null, // 加菜模式下后端返回的已有订单
    items: {}, // { [dishId]: { dish, amount } }
  }),
  getters: {
    list: (state) => Object.values(state.items),
    totalCount: (state) => Object.values(state.items).reduce((s, i) => s + i.amount, 0),
    totalPrice: (state) =>
      Object.values(state.items).reduce((s, i) => s + i.dish.price * i.amount, 0),
  },
  actions: {
    // 从扫码落地页进入时设置上下文
    setContext(tableId, mode, activeOrder = null) {
      // 路由参数是字符串、接口数据可能是数字，统一后比较。
      // 一旦切到另一桌，原购物车绝不能继续带过去。
      const previousTableId = this.tableId == null ? null : String(this.tableId)
      const nextTableId = tableId == null ? null : String(tableId)
      if (previousTableId !== nextTableId) {
        this.items = {}
      }
      this.tableId = tableId
      this.mode = mode
      this.activeOrder = activeOrder
    },
    addItem(dish) {
      const currentAmount = this.items[dish.id]?.amount || 0
      return this.setItemAmount(dish, currentAmount + 1)
    },
    setItemAmount(dish, amount) {
      const nextAmount = Number(amount)
      if (!Number.isInteger(nextAmount) || nextAmount < 0) {
        return { ok: false, message: '菜品数量不合法' }
      }
      if (nextAmount > ORDER_LIMITS.maxAmountPerDish) {
        return { ok: false, message: `单个菜品最多 ${ORDER_LIMITS.maxAmountPerDish} 份` }
      }
      if (nextAmount === 0) {
        delete this.items[dish.id]
        return { ok: true }
      }
      if (!this.items[dish.id] && Object.keys(this.items).length >= ORDER_LIMITS.maxKinds) {
        return { ok: false, message: `一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品` }
      }
      this.items[dish.id] = { dish, amount: nextAmount }
      return { ok: true }
    },
    decItem(dishId) {
      if (this.items[dishId]) {
        this.setItemAmount(this.items[dishId].dish, this.items[dishId].amount - 1)
      }
    },
    deleteItem(dishId) {
      delete this.items[dishId]
    },
    clear() {
      this.items = {}
    },
    // 提交成功后清空购物车，但保留桌台上下文以便继续加菜
    resetAfterSubmit() {
      this.items = {}
    },
  },
})
