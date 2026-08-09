<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="aside">
      <div class="logo">
        <span class="logo-icon">🍜</span>
        <span>餐厅管理系统</span>
      </div>
      <el-menu :default-active="activeMenu" router background-color="#1f2430" text-color="#a8b2c1" active-text-color="#fff">
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><Tickets /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.isAdmin || auth.isWaiter" index="/order-take">
          <el-icon><ShoppingCart /></el-icon>
          <span>帮顾客点餐</span>
        </el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/dishes">
          <el-icon><Dish /></el-icon>
          <span>菜品管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/categories">
          <el-icon><Menu /></el-icon>
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/tables">
          <el-icon><Grid /></el-icon>
          <span>桌台管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/employees">
          <el-icon><User /></el-icon>
          <span>员工管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ route.meta.title || '' }}</span>
          <el-tag v-if="auth.isChef" size="small" type="primary" effect="dark" style="cursor: pointer" @click="router.push('/kitchen')">
            后厨屏入口 →
          </el-tag>
        </div>
        <div class="header-right">
          <el-tag size="small" :type="roleTagType">{{ roleLabel }}</el-tag>
          <span class="user-name">{{ auth.name }}</span>
          <el-button link type="primary" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '../store/auth'
import { ROLES } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeMenu = computed(() => {
  if (route.path.startsWith('/kitchen')) return ''
  return route.path
})

const roleLabel = computed(() => ROLES[auth.role]?.label || '未知')
const roleTagType = computed(() => ROLES[auth.role]?.type || 'info')

const logout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.layout {
  height: 100%;
}

.aside {
  background: var(--sidebar-bg);
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.15);
}

.logo-icon {
  font-size: 22px;
}

.aside :deep(.el-menu) {
  --el-menu-active-color: #fff;
}

.aside :deep(.el-menu-item.is-active) {
  background: var(--brand-color) !important;
}

.aside :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 14px;
  color: #303133;
}

.main {
  padding: 0;
  overflow-y: auto;
}
</style>
