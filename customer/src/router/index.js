import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../store/user'
import { resolveCustomerRoute } from './guard'

const routes = [
  { path: '/', name: 'entry', component: () => import('../views/Entry.vue') },
  {
    path: '/table/:tableId/menu',
    name: 'table-menu',
    component: () => import('../views/Menu.vue'),
  },
  {
    path: '/table/:tableId/cart',
    name: 'table-cart',
    component: () => import('../views/Cart.vue'),
  },
  {
    path: '/table/:tableId/ai-order',
    name: 'table-ai-order',
    component: () => import('../views/AiOrder.vue'),
  },
  { path: '/table/:tableId', name: 'landing', component: () => import('../views/Landing.vue') },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
  { path: '/menu', redirect: '/' },
  { path: '/cart', redirect: '/' },
  {
    path: '/order-detail/:id',
    name: 'order-detail',
    component: () => import('../views/OrderDetail.vue'),
  },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  return resolveCustomerRoute(to, userStore.isLogin)
})

export default router
