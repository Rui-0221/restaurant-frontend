<template>
  <SkipLink />
  <el-container class="layout">
    <el-aside v-if="!compact" :width="collapsed ? '72px' : '240px'" class="aside">
      <AdminNav :active-menu="activeMenu" :collapsed="collapsed" />
    </el-aside>

    <el-container class="content-container">
      <el-header class="header" aria-label="页面工具栏">
        <div class="header-left">
          <el-button
            class="collapse-button"
            text
            circle
            :aria-expanded="compact ? mobileMenuOpen : !collapsed"
            :aria-label="navigationButtonLabel"
            @click="toggleNavigation"
          >
            <el-icon>
              <Menu v-if="compact" />
              <Expand v-else-if="collapsed" />
              <Fold v-else />
            </el-icon>
          </el-button>
          <span class="page-title">{{ route.meta.title || '' }}</span>
          <router-link v-if="auth.isChef" class="kitchen-link" to="/kitchen">
            <span class="kitchen-label">后厨屏入口</span>
            <span aria-hidden="true">→</span>
          </router-link>
        </div>
        <div class="header-right">
          <el-tag size="small" :type="roleTagType">{{ roleLabel }}</el-tag>
          <span class="user-name">{{ auth.name }}</span>
          <el-button class="logout-button" link type="primary" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main id="main-content" class="main" tabindex="-1">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-drawer
    v-model="mobileMenuOpen"
    class="mobile-nav-drawer"
    direction="ltr"
    :with-header="false"
    size="280px"
    append-to-body
  >
    <div class="drawer-navigation">
      <AdminNav :active-menu="activeMenu" @navigate="mobileMenuOpen = false" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import AdminNav from '../components/AdminNav.vue'
import SkipLink from '../components/SkipLink.vue'
import { useAuthStore } from '../store/auth'
import { ROLES } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const compact = ref(false)
const collapsed = ref(false)
const mobileMenuOpen = ref(false)
let compactMedia

const activeMenu = computed(() => {
  if (route.path.startsWith('/kitchen')) return ''
  return route.path
})

const navigationButtonLabel = computed(() => {
  if (compact.value) return mobileMenuOpen.value ? '关闭导航' : '打开导航'
  return collapsed.value ? '展开导航' : '收起导航'
})

const roleLabel = computed(() => ROLES[auth.role]?.label || '未知')
const roleTagType = computed(() => ROLES[auth.role]?.type || 'info')

const updateCompact = (event) => {
  compact.value = event.matches
  if (!event.matches) mobileMenuOpen.value = false
}

const toggleNavigation = () => {
  if (compact.value) {
    mobileMenuOpen.value = !mobileMenuOpen.value
    return
  }
  collapsed.value = !collapsed.value
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  },
)

onMounted(() => {
  compactMedia = window.matchMedia('(max-width: 768px)')
  compact.value = compactMedia.matches
  compactMedia.addEventListener('change', updateCompact)
})

onBeforeUnmount(() => {
  compactMedia?.removeEventListener('change', updateCompact)
})

const logout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.layout {
  height: 100dvh;
  min-height: 0;
}

.aside {
  position: relative;
  z-index: 2;
  overflow-x: hidden;
  background: var(--sidebar-bg);
  box-shadow: 8px 0 28px rgb(45 33 28 / 10%);
  transition: width var(--motion-base) ease;
}

.content-container {
  min-width: 0;
  min-height: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid rgb(233 224 216 / 82%);
  background: rgb(255 253 250 / 92%);
  box-shadow: 0 4px 18px rgb(87 58 39 / 5%);
  backdrop-filter: blur(14px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.collapse-button {
  flex: 0 0 var(--tap-target-min);
  width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  color: var(--text-sub);
  font-size: 18px;
}

.page-title {
  overflow: hidden;
  color: var(--text-main);
  font-size: 18px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kitchen-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 5px 10px;
  border-radius: var(--radius-xl);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.header-right {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
}

.logout-button {
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
}

.main {
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow-y: auto;
  background: transparent;
  scroll-behavior: smooth;
}

.drawer-navigation {
  width: 100%;
  height: 100dvh;
}

@media (max-width: 768px) {
  .header {
    height: calc(60px + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 12px 0;
  }

  .header-left {
    gap: 6px;
  }

  .header-right {
    gap: 4px;
  }

  .page-title {
    font-size: 16px;
  }

  .user-name {
    display: none;
  }
}

@media (max-width: 480px) {
  .kitchen-link {
    min-width: var(--tap-target-min);
    justify-content: center;
    padding-inline: 8px;
  }

  .kitchen-label {
    display: none;
  }
}
</style>
