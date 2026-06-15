<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="stat-card stat-card--blue">
          <div class="stat-icon-wrap">
            <el-icon size="28" color="#fff"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalEmployees }}</div>
            <div class="stat-label">员工总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card--green">
          <div class="stat-icon-wrap">
            <el-icon size="28" color="#fff"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayAttendance }}</div>
            <div class="stat-label">今日出勤</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card--orange">
          <div class="stat-icon-wrap">
            <el-icon size="28" color="#fff"><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayLate }}</div>
            <div class="stat-label">今日迟到</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card--red">
          <div class="stat-icon-wrap">
            <el-icon size="28" color="#fff"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingLeaves }}</div>
            <div class="stat-label">待审批请假</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 24px">
      <el-col :span="14">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>本月考勤概览</span>
            </div>
          </template>
          <div ref="attendanceChart" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <div class="action-item" @click="goTo('/attendance/clock')">
              <div class="action-icon action-icon--blue">
                <el-icon size="22" color="#fff"><Clock /></el-icon>
              </div>
              <span>考勤打卡</span>
            </div>
            <div class="action-item" @click="goTo('/leave/apply')">
              <div class="action-icon action-icon--green">
                <el-icon size="22" color="#fff"><EditPen /></el-icon>
              </div>
              <span>申请请假</span>
            </div>
            <div class="action-item" @click="goTo('/makeup/apply')">
              <div class="action-icon action-icon--purple">
                <el-icon size="22" color="#fff"><Tickets /></el-icon>
              </div>
              <span>补卡申请</span>
            </div>
            <div class="action-item" @click="goTo('/attendance')">
              <div class="action-icon action-icon--orange">
                <el-icon size="22" color="#fff"><Calendar /></el-icon>
              </div>
              <span>我的考勤</span>
            </div>
            <div class="action-item" @click="goTo('/leave')">
              <div class="action-icon action-icon--gray">
                <el-icon size="22" color="#fff"><Document /></el-icon>
              </div>
              <span>我的请假</span>
            </div>
            <div class="action-item" @click="goTo('/makeup')">
              <div class="action-icon action-icon--cyan">
                <el-icon size="22" color="#fff"><List /></el-icon>
              </div>
              <span>我的补卡</span>
            </div>
          </div>
        </el-card>

        <el-card class="section-card" style="margin-top: 20px" v-if="userStore.isHR || userStore.isManager">
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
              <el-avatar :size="36" class="todo-avatar">
                {{ item.employee_name?.charAt(0) }}
              </el-avatar>
              <div class="todo-content">
                <div class="todo-title">{{ item.employee_name }} 申请{{ leaveTypeMap[item.leave_type] }}</div>
                <div class="todo-desc">{{ item.start_date }} 至 {{ item.end_date }} ({{ item.days }}天)</div>
              </div>
              <el-tag type="warning" size="small" round>待审批</el-tag>
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
  EditPen,
  Tickets,
  List
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
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: #fff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  top: -30%;
  right: -20%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.stat-card--blue {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 4px 16px rgba(79, 172, 254, 0.3);
}

.stat-card--green {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  box-shadow: 0 4px 16px rgba(67, 233, 123, 0.3);
}

.stat-card--orange {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  box-shadow: 0 4px 16px rgba(250, 112, 154, 0.3);
}

.stat-card--red {
  background: linear-gradient(135deg, #f5576c 0%, #ff6a88 100%);
  box-shadow: 0 4px 16px rgba(245, 87, 108, 0.3);
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(4px);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
  font-weight: 400;
}

.chart-card,
.section-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chart-card :deep(.el-card__header),
.section-card :deep(.el-card__header) {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
}

.chart-card :deep(.el-card__body),
.section-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  padding: 4px 0;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  border-radius: 14px;
  cursor: pointer;
  background: #fafbfc;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.action-item:hover {
  background: #fff;
  border-color: #e8e8e8;
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.action-item:hover .action-icon {
  transform: scale(1.1);
}

.action-icon--blue {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.action-icon--green {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.action-icon--orange {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.action-icon--gray {
  background: linear-gradient(135deg, #8e9eab 0%, #eef2f3 100%);
}

.action-icon--purple {
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
}

.action-icon--cyan {
  background: linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%);
}

.action-item span {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.todo-list {
  max-height: 280px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-bottom: 6px;
}

.todo-item:hover {
  background: #f5f7fa;
  transform: translateX(4px);
}

.todo-avatar {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  flex-shrink: 0;
  font-size: 14px;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item {
  margin-left: 10px;
}
</style>
