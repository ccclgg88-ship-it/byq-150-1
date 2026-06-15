<template>
  <el-container class="main-layout">
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <div class="logo-icon">
          <el-icon size="22"><OfficeBuilding /></el-icon>
        </div>
        <div class="logo-text">
          <span class="logo-title">HR考勤系统</span>
          <span class="logo-subtitle">Employee Management</span>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="transparent"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
        :collapse="false"
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-menu-item v-if="!route.meta?.hidden" :index="resolvePath(route.path)">
            <el-icon>
              <component :is="route.meta?.icon" />
            </el-icon>
            <span>{{ route.meta?.title }}</span>
            <el-badge 
              v-if="route.path === 'leave/approval' && pendingCount > 0" 
              :value="pendingCount" 
              class="menu-badge"
            />
            <el-badge 
              v-if="route.path === 'makeup/approval' && makeupPendingCount > 0" 
              :value="makeupPendingCount" 
              class="menu-badge"
            />
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ currentPageTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="36" class="user-avatar">
                {{ userStore.userInfo?.name?.charAt(0) }}
              </el-avatar>
              <div class="user-detail">
                <span class="username">{{ userStore.userInfo?.name }}</span>
                <span class="role-tag">
                  {{ roleMap[userStore.role] || userStore.role }}
                </span>
              </div>
              <el-icon class="dropdown-icon"><CaretBottom /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getPendingCount } from '@/api/leave'
import { getPendingMakeupCount } from '@/api/makeup'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  OfficeBuilding, 
  CaretBottom
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const pendingCount = ref(0)
const makeupPendingCount = ref(0)

const roleMap = {
  'hr': 'HR管理员',
  'manager': '部门主管',
  'employee': '普通员工'
}

const menuRoutes = computed(() => {
  const routes = route.matched[0]?.children?.filter(r => {
    if (r.meta?.roles && r.meta.roles.length > 0) {
      return r.meta.roles.includes(userStore.role)
    }
    return true
  }) || []
  return routes
})

const activeMenu = computed(() => {
  return route.path
})

const currentPageTitle = computed(() => {
  return route.meta?.title || ''
})

function resolvePath(path) {
  if (path.startsWith('/')) return path
  return '/' + path
}

async function fetchPendingCount() {
  if (userStore.isHR || userStore.isManager) {
    try {
      const [leaveRes, makeupRes] = await Promise.all([
        getPendingCount(),
        getPendingMakeupCount()
      ])
      pendingCount.value = leaveRes.count
      makeupPendingCount.value = makeupRes.count
    } catch (error) {
      console.error('获取待审批数量失败:', error)
    }
  }
}

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    }).catch(() => {})
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => {
  fetchPendingCount()
})
</script>

<style scoped>
.main-layout {
  height: 100%;
}

.sidebar {
  background: linear-gradient(180deg, #1e1b4b 0%, #312e81 35%, #3730a3 70%, #4338ca 100%);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 4px 0 24px rgba(30, 27, 75, 0.15);
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 20% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
                    radial-gradient(circle at 80% 100%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.sidebar::-webkit-scrollbar {
  width: 0;
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
}

.logo-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  letter-spacing: 0.3px;
}

.logo-subtitle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 2px;
}

:deep(.el-menu) {
  border-right: none;
  padding: 12px 10px;
  position: relative;
  z-index: 1;
  background: transparent;
}

:deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
  position: relative;
  border-radius: 10px;
  margin-bottom: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 16px !important;
  color: rgba(255, 255, 255, 0.7) !important;
}

:deep(.el-menu-item .el-icon) {
  color: inherit !important;
  font-size: 18px;
  margin-right: 12px;
}

:deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
  transform: translateX(2px);
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%) !important;
  color: #fff !important;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

:deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 22px;
  border-radius: 4px;
  background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.5);
}

.menu-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.el-container {
  margin-left: 240px;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 68px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-left .page-title {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-info:hover {
  background-color: #f5f3ff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-size: 14px;
  color: #1f2937;
  font-weight: 700;
  line-height: 1.2;
}

.role-tag {
  font-size: 11px;
  color: #6366f1;
  font-weight: 600;
  padding: 2px 8px;
  background: #eef2ff;
  border-radius: 6px;
  width: fit-content;
  margin-top: 2px;
}

.dropdown-icon {
  color: #9ca3af;
  font-size: 12px;
}

.main-content {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 28px 32px 32px;
  min-height: calc(100vh - 68px);
}

.content-wrapper {
  max-width: 1440px;
  margin: 0 auto;
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
