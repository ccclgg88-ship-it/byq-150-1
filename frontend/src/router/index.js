import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'employees',
        name: 'Employees',
        component: () => import('@/views/employees/EmployeeList.vue'),
        meta: { title: '员工花名册', icon: 'UserFilled', roles: ['hr', 'manager'] }
      },
      {
        path: 'employees/:id',
        name: 'EmployeeDetail',
        component: () => import('@/views/employees/EmployeeDetail.vue'),
        meta: { title: '员工详情', icon: 'User', roles: ['hr', 'manager'], hidden: true }
      },
      {
        path: 'attendance',
        name: 'Attendance',
        component: () => import('@/views/attendance/MyAttendance.vue'),
        meta: { title: '我的考勤', icon: 'Calendar' }
      },
      {
        path: 'attendance/clock',
        name: 'AttendanceClock',
        component: () => import('@/views/attendance/AttendanceClock.vue'),
        meta: { title: '考勤打卡', icon: 'Clock', hidden: true }
      },
      {
        path: 'attendance/department',
        name: 'DepartmentAttendance',
        component: () => import('@/views/attendance/DepartmentAttendance.vue'),
        meta: { title: '部门考勤汇总', icon: 'DataLine', roles: ['hr', 'manager'] }
      },
      {
        path: 'leave',
        name: 'Leave',
        component: () => import('@/views/leave/MyLeave.vue'),
        meta: { title: '我的请假', icon: 'Document' }
      },
      {
        path: 'leave/apply',
        name: 'LeaveApply',
        component: () => import('@/views/leave/LeaveApply.vue'),
        meta: { title: '申请请假', icon: 'EditPen', hidden: true }
      },
      {
        path: 'leave/approval',
        name: 'LeaveApproval',
        component: () => import('@/views/leave/LeaveApproval.vue'),
        meta: { title: '待我审批', icon: 'Check', roles: ['hr', 'manager'] }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/Reports.vue'),
        meta: { title: '报表统计', icon: 'PieChart', roles: ['hr', 'manager'] }
      },
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/settings/Departments.vue'),
        meta: { title: '部门管理', icon: 'OfficeBuilding', roles: ['hr'] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  document.title = `${to.meta.title || ''} - 员工花名册与考勤联动系统`
  
  if (to.meta.requiresAuth === false) {
    if (userStore.isLogin && to.path === '/login') {
      next('/')
    } else {
      next()
    }
    return
  }
  
  if (!userStore.isLogin) {
    next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    return
  }
  
  if (to.meta.roles && to.meta.roles.length > 0) {
    if (!to.meta.roles.includes(userStore.role)) {
      next('/403')
      return
    }
  }
  
  next()
})

export default router
