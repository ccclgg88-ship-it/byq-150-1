<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #ecf5ff">
              <el-icon size="32" color="#409EFF"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalEmployees }}</div>
              <div class="stat-label">员工总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f0f9eb">
              <el-icon size="32" color="#67C23A"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayAttendance }}</div>
              <div class="stat-label">今日出勤</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #fdf6ec">
              <el-icon size="32" color="#E6A23C"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayLate }}</div>
              <div class="stat-label">今日迟到</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #fef0f0">
              <el-icon size="32" color="#F56C6C"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingLeaves }}</div>
              <div class="stat-label">待审批请假</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>本月考勤概览</span>
            </div>
          </template>
          <div ref="attendanceChart" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <div class="action-item" @click="goTo('/attendance/clock')">
              <el-icon size="28" color="#409EFF"><Clock /></el-icon>
              <span>考勤打卡</span>
            </div>
            <div class="action-item" @click="goTo('/leave/apply')">
              <el-icon size="28" color="#67C23A"><EditPen /></el-icon>
              <span>申请请假</span>
            </div>
            <div class="action-item" @click="goTo('/attendance')">
              <el-icon size="28" color="#E6A23C"><Calendar /></el-icon>
              <span>我的考勤</span>
            </div>
            <div class="action-item" @click="goTo('/leave')">
              <el-icon size="28" color="#909399"><Document /></el-icon>
              <span>我的请假</span>
            </div>
          </div>
        </el-card>

        <el-card style="margin-top: 20px" v-if="userStore.isHR || userStore.isManager">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
              <el-badge :value="pendingCount" class="item" type="danger">
                <span style="font-size: 12px; color: #909399">待审批</span>
              </el-badge>
            </div>
          </template>
          <el-empty v-if="pendingList.length === 0" description="暂无待办事项" :image-size="80" />
          <div v-else class="todo-list">
            <div 
              class="todo-item" 
              v-for="item in pendingList.slice(0, 5)" 
              :key="item.id"
              @click="goTo('/leave/approval')"
            >
              <div class="todo-user">
                <el-avatar :size="36" style="background-color: #409EFF">
                  {{ item.employee_name?.charAt(0) }}
                </el-avatar>
              </div>
              <div class="todo-content">
                <div class="todo-title">{{ item.employee_name }} 申请{{ leaveTypeMap[item.leave_type] }}</div>
                <div class="todo-desc">{{ item.start_date }} 至 {{ item.end_date }} ({{ item.days }}天)</div>
              </div>
              <el-tag type="warning" size="small">待审批</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { getMyAttendance } from '@/api/attendance'
import { getPendingLeaves, getPendingCount } from '@/api/leave'
import { 
  User, 
  Clock, 
  Warning, 
  Document,
  Calendar,
  EditPen
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const attendanceChart = ref(null)
const pendingList = ref([])
const pendingCount = ref(0)

const leaveTypeMap = {
  annual: '年假',
  personal: '事假',
  sick: '病假'
}

const stats = reactive({
  totalEmployees: 0,
  todayAttendance: 0,
  todayLate: 0,
  pendingLeaves: 0
})

async function loadDashboardData() {
  try {
    const currentMonth = dayjs().format('YYYY-MM')
    const [attendanceRes, pendingRes, countRes] = await Promise.all([
      getMyAttendance(currentMonth),
      getPendingLeaves({ page: 1, pageSize: 5 }),
      getPendingCount()
    ])
    
    if (attendanceRes.summary) {
      stats.todayAttendance = attendanceRes.summary.normal_days || 0
      stats.todayLate = attendanceRes.summary.late_days || 0
    }
    
    pendingList.value = pendingRes.list || []
    pendingCount.value = countRes.count || 0
    stats.pendingLeaves = countRes.count || 0
    stats.totalEmployees = 8
    
    if (attendanceChart.value) {
      initAttendanceChart(attendanceRes.calendar || [])
    }
  } catch (error) {
    console.error('加载首页数据失败:', error)
  }
}

function initAttendanceChart(calendarData) {
  const chartDom = attendanceChart.value
  const myChart = echarts.init(chartDom)
  
  const summary = {
    normal: 0,
    late: 0,
    early_leave: 0,
    leave: 0,
    absent: 0
  }
  
  calendarData.forEach(item => {
    if (item.status === 'normal') summary.normal++
    if (item.status === 'late') summary.late++
    if (item.status === 'early_leave') summary.early_leave++
    if (item.status === 'leave') summary.leave++
    if (item.status === 'absent') summary.absent++
  })
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['正常出勤', '迟到', '早退', '请假', '缺勤'],
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '天数'
    },
    series: [{
      type: 'bar',
      data: [
        { value: summary.normal, itemStyle: { color: '#67C23A' } },
        { value: summary.late, itemStyle: { color: '#E6A23C' } },
        { value: summary.early_leave, itemStyle: { color: '#F56C6C' } },
        { value: summary.leave, itemStyle: { color: '#909399' } },
        { value: summary.absent, itemStyle: { color: '#606266' } }
      ],
      barWidth: '50%',
      label: {
        show: true,
        position: 'top'
      }
    }]
  }
  
  myChart.setOption(option)
  
  window.addEventListener('resize', () => {
    myChart.resize()
  })
}

function goTo(path) {
  router.push(path)
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 10px 0;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  background-color: #f5f7fa;
  transform: translateY(-2px);
}

.action-item span {
  font-size: 14px;
  color: #606266;
}

.todo-list {
  max-height: 250px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.todo-item:hover {
  background-color: #f5f7fa;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-content {
  flex: 1;
}

.todo-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.todo-desc {
  font-size: 12px;
  color: #909399;
}

.item {
  margin-left: 10px;
}
</style>
