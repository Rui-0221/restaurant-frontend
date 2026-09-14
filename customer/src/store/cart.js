import { defineStore } from 'pinia'
import { normalizeTableId } from '../router/tableRoutes.js'
import { clearCartSession, loadCartSession, saveCartSession } from '../utils/cartSession.js'
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
    persistSession() {
      if (this.tableId === null) return
      saveCartSession(this.tableId, this.list)
    },

    // 从扫码落地页进入时设置上下文
    setContext(tableId, mode, activeOrder = null) {
      const previousTableId = normalizeTableId(this.tableId)
      const nextTableId = normalizeTableId(tableId)
      if (nextTableId === null) {
        this.items = {}
        this.tableId = null
        clearCartSession()
        this.mode = mode
        this.activeOrder = activeOrder
        return
      }
      if (previousTableId !== null && previousTableId !== nextTableId) {
        this.items = {}
        clearCartSession()
      }
      this.tableId = typeof tableId === 'number' ? tableId : nextTableId
      this.mode = mode
      this.activeOrder = activeOrder
      if (previousTableId !== null && previousTableId !== nextTableId) this.persistSession()
    },

    hydrateForTable(tableId) {
      const normalizedTableId = normalizeTableId(tableId)
      if (normalizedTableId === null) {
        this.items = {}
        this.tableId = null
        clearCartSession()
        return []
      }

      const restored = loadCartSession(normalizedTableId)
      this.tableId = typeof tableId === 'number' ? tableId : normalizedTableId
      this.items = Object.fromEntries((restored?.items ?? []).map((item) => [item.dish.id, item]))
      return restored?.items ?? []
    },
    // 统一接收一组菜品，全部通过数量限制后再写入；调用方无需读取购物车。
    addItems(items) {
      const next = { ...this.items }
      for (const item of items) {
        const amount = (next[item.dish.id]?.amount || 0) + Number(item.amount)
        if (!Number.isInteger(amount) || amount < 1 || amount > ORDER_LIMITS.maxAmountPerDish) {
          return { ok: false, message: '合并后单个菜品最多 99 份，请先调整购物车' }
        }
        next[item.dish.id] = { dish: next[item.dish.id]?.dish || item.dish, amount }
      }
      if (Object.keys(next).length > ORDER_LIMITS.maxKinds) {
        return { ok: false, message: '一次最多选择 50 种菜品，请先调整购物车' }
      }
      this.items = next
      this.persistSession()
      return { ok: true }
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
        this.persistSession()
        return { ok: true }
      }
      if (!this.items[dish.id] && Object.keys(this.items).length >= ORDER_LIMITS.maxKinds) {
        return { ok: false, message: `一次最多选择 ${ORDER_LIMITS.maxKinds} 种菜品` }
      }
      this.items[dish.id] = { dish, amount: nextAmount }
      this.persistSession()
      return { ok: true }
    },
    decItem(dishId) {
      if (this.items[dishId]) {
        this.setItemAmount(this.items[dishId].dish, this.items[dishId].amount - 1)
      }
    },
    deleteItem(dishId) {
      delete this.items[dishId]
      this.persistSession()
    },
    clear() {
      this.items = {}
      this.persistSession()
    },
    // 提交成功后清空购物车，但保留桌台上下文以便继续加菜
    resetAfterSubmit() {
      this.items = {}
      this.persistSession()
    },
  },
})
