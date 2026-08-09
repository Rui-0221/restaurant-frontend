import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  { path: '/', redirect: '/menu' },
  { path: '/table/:tableId', name: 'landing', component: () => import('../views/Landing.vue') },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
  { path: '/menu', name: 'menu', component: () => import('../views/Menu.vue') },
  { path: '/cart', name: 'cart', component: () => import('../views/Cart.vue') },
  { path: '/order-detail/:id', name: 'order-detail', component: () => import('../views/OrderDetail.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 轻量守卫：点餐/购物车需要登录，未登录跳登录页并记录回跳
router.beforeEach((to) => {
  const userStore = useUserStore()
  const needAuth = ['menu', 'cart']
  if (needAuth.includes(to.name) && !userStore.isLogin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
