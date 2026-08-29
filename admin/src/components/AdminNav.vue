<template>
  <nav class="admin-navigation" aria-label="主导航">
    <div class="brand" :class="{ 'is-collapsed': collapsed }">
      <span class="brand-mark" aria-hidden="true">🍜</span>
      <div v-show="!collapsed" class="brand-copy">
        <strong translate="no">有味餐厅</strong>
        <span>运营管理</span>
      </div>
    </div>

    <el-menu
      class="navigation-menu"
      :default-active="activeMenu"
      :collapse="collapsed"
      :collapse-transition="false"
      router
      background-color="transparent"
      text-color="var(--sidebar-text)"
      active-text-color="var(--sidebar-active)"
      @select="$emit('navigate')"
    >
      <el-menu-item index="/dashboard" v-bind="keyboardItemProps">
        <el-icon><DataBoard /></el-icon>
        <span>工作台</span>
      </el-menu-item>
      <el-menu-item index="/orders" v-bind="keyboardItemProps">
        <el-icon><Tickets /></el-icon>
        <span>订单管理</span>
      </el-menu-item>
      <el-menu-item
        v-if="auth.isAdmin || auth.isWaiter"
        index="/order-take"
        v-bind="keyboardItemProps"
      >
        <el-icon><ShoppingCart /></el-icon>
        <span>帮顾客点餐</span>
      </el-menu-item>
      <el-menu-item v-if="auth.isAdmin" index="/dishes" v-bind="keyboardItemProps">
        <el-icon><Dish /></el-icon>
        <span>菜品管理</span>
      </el-menu-item>
      <el-menu-item v-if="auth.isAdmin" index="/dish-ai-profiles" v-bind="keyboardItemProps">
        <el-icon><MagicStick /></el-icon>
        <span>AI 菜品手册</span>
      </el-menu-item>
      <el-menu-item v-if="auth.isAdmin" index="/categories" v-bind="keyboardItemProps">
        <el-icon><Menu /></el-icon>
        <span>分类管理</span>
      </el-menu-item>
      <el-menu-item index="/tables" v-bind="keyboardItemProps">
        <el-icon><Grid /></el-icon>
        <span>桌台管理</span>
      </el-menu-item>
      <el-menu-item v-if="auth.isAdmin" index="/employees" v-bind="keyboardItemProps">
        <el-icon><User /></el-icon>
        <span>员工管理</span>
      </el-menu-item>
    </el-menu>

    <p v-show="!collapsed" class="navigation-footnote">专注每一桌的用餐体验</p>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../store/auth'

defineProps({
  activeMenu: {
    type: String,
    default: '',
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['navigate'])

const auth = useAuthStore()

const keyboardItemProps = {
  tabindex: 0,
  onKeydown: (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.currentTarget.click()
  },
}
</script>

<style scoped>
.admin-navigation {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 0%, rgb(229 77 46 / 20%), transparent 18rem), var(--sidebar-bg);
}

.brand {
  display: flex;
  flex: 0 0 72px;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 18px;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
}

.brand.is-collapsed {
  justify-content: center;
  padding-inline: 8px;
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: var(--radius-md);
  background: rgb(255 255 255 / 9%);
  font-size: 22px;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: #fff;
  line-height: 1.25;
}

.brand-copy strong {
  font-size: 16px;
  letter-spacing: 1px;
}

.brand-copy span {
  margin-top: 4px;
  color: var(--sidebar-muted);
  font-size: 11px;
  letter-spacing: 3px;
}

.navigation-menu {
  flex: 1;
  padding: 12px 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.navigation-menu:not(.el-menu--collapse) {
  width: 100%;
}

.navigation-menu :deep(.el-menu-item) {
  height: 48px;
  margin: 4px 12px;
  border-radius: var(--radius-md);
  transition:
    color var(--motion-fast) ease,
    background-color var(--motion-fast) ease,
    transform var(--motion-fast) ease;
}

.navigation-menu :deep(.el-menu-item:hover) {
  background: rgb(255 255 255 / 8%);
  color: #fff;
}

.navigation-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, var(--brand-dark), var(--brand-active));
  box-shadow: 0 8px 20px rgb(201 61 32 / 24%);
}

.navigation-menu.el-menu--collapse :deep(.el-menu-item) {
  justify-content: center;
  margin-inline: 8px;
  padding-inline: 0 !important;
}

.navigation-footnote {
  flex: 0 0 auto;
  padding: 16px 20px 20px;
  color: var(--sidebar-muted);
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
