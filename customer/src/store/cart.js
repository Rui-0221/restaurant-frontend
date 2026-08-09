import { defineStore } from 'pinia'

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
      this.tableId = tableId
      this.mode = mode
      this.activeOrder = activeOrder
    },
    addItem(dish) {
      if (this.items[dish.id]) {
        this.items[dish.id].amount++
      } else {
        this.items[dish.id] = { dish, amount: 1 }
      }
    },
    decItem(dishId) {
      if (this.items[dishId]) {
        this.items[dishId].amount--
        if (this.items[dishId].amount <= 0) {
          delete this.items[dishId]
        }
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
