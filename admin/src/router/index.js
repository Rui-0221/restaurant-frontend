import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
      { path: 'orders', name: 'orders', component: () => import('../views/Orders.vue'), meta: { title: '订单管理' } },
      { path: 'dishes', name: 'dishes', component: () => import('../views/Dishes.vue'), meta: { title: '菜品管理', adminOnly: true } },
      { path: 'categories', name: 'categories', component: () => import('../views/Categories.vue'), meta: { title: '分类管理', adminOnly: true } },
      { path: 'tables', name: 'tables', component: () => import('../views/Tables.vue'), meta: { title: '桌台管理' } },
      { path: 'employees', name: 'employees', component: () => import('../views/Employees.vue'), meta: { title: '员工管理', adminOnly: true } },
    ],
  },
  {
    path: '/kitchen',
    name: 'kitchen',
    component: () => import('../views/Kitchen.vue'),
    meta: { title: '后厨屏', requiresRole: 3 }, // 仅后厨
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 守卫：未登录跳登录；adminOnly 页面仅管理员；kitchen 仅后厨
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { path: '/dashboard' }
  }
  if (to.meta.requiresRole && auth.role !== to.meta.requiresRole) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
