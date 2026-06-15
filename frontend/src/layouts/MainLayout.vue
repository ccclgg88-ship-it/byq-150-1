<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="28"><OfficeBuilding /></el-icon>
        <span class="logo-text">HR考勤系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
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
              <el-avatar :size="32" style="background-color: #409EFF">
                {{ userStore.userInfo?.name?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.name }}</span>
              <span class="role-tag">
                {{ roleMap[userStore.role] || userStore.role }}
              </span>
              <el-icon><CaretBottom /></el-icon>
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
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getPendingCount } from '@/api/leave'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  OfficeBuilding, 
  CaretBottom
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const pendingCount = ref(0)

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
      const res = await getPendingCount()
      pendingCount.value = res.count
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
    ElMessage.info('个人信息功能开发中')
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
  background-color: #304156;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
  gap: 10px;
}

.logo-text {
  font-size: 16px;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  position: relative;
}

.menu-badge {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.el-container {
  margin-left: 220px;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-left .page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 0 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

.role-tag {
  font-size: 12px;
  padding: 2px 6px;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 4px;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  min-height: calc(100vh - 60px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
