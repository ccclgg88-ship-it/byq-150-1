<template>
  <div class="attendance-clock">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">考勤打卡</h2>
      </div>
    </div>

    <div class="clock-container">
      <el-card class="clock-card">
        <div class="clock-wrapper">
          <div class="date-display">
            <span class="date">{{ todayDate }}</span>
            <span class="weekday">{{ todayWeekday }}</span>
          </div>
          
          <div class="time-display">
            <span class="time">{{ currentTime }}</span>
          </div>

          <div class="status-badge" :class="statusClass">
            {{ statusText }}
          </div>

          <div class="clock-buttons">
            <el-button 
              type="primary" 
              size="large" 
              :icon="Sunny"
              :disabled="!canClockIn || clockedIn"
              :loading="clockingIn"
              @click="handleClockIn"
              style="width: 180px; height: 50px; font-size: 16px"
            >
              上班打卡
            </el-button>
            <el-button 
              type="success" 
              size="large" 
              :icon="Moon"
              :disabled="!canClockOut || !clockedIn || clockedOut"
              :loading="clockingOut"
              @click="handleClockOut"
              style="width: 180px; height: 50px; font-size: 16px"
            >
              下班打卡
            </el-button>
          </div>

          <el-divider />

          <div class="record-info">
            <div class="info-row">
              <span class="label">上班打卡</span>
              <span class="value" :class="{ 'text-late': isLate }">
                {{ todayRecord?.clock_in_time || '--:--' }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">下班打卡</span>
              <span class="value" :class="{ 'text-early': isEarlyLeave }">
                {{ todayRecord?.clock_out_time || '--:--' }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">工作时长</span>
              <span class="value">{{ todayRecord?.work_hours || 0 }} 小时</span>
            </div>
          </div>

          <div v-if="isOnLeave" class="leave-tip">
            <el-alert
              title="您当前处于请假状态，无法打卡"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Sunny, Moon } from '@element-plus/icons-vue'
import { getTodayAttendance, clockIn, clockOut } from '@/api/attendance'
import dayjs from 'dayjs'

const router = useRouter()

const currentTime = ref('')
const todayDate = ref('')
const todayWeekday = ref('')
const todayRecord = ref(null)
const isOnLeave = ref(false)
const canClockIn = ref(true)
const canClockOut = ref(true)
const clockingIn = ref(false)
const clockingOut = ref(false)

let timer = null

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const clockedIn = computed(() => !!todayRecord.value?.clock_in_time)
const clockedOut = computed(() => !!todayRecord.value?.clock_out_time)

const isLate = computed(() => todayRecord.value?.status === 'late')
const isEarlyLeave = computed(() => todayRecord.value?.status === 'early_leave')

const statusText = computed(() => {
  if (isOnLeave.value) return '请假中'
  if (!todayRecord.value) return '未打卡'
  if (todayRecord.value.status === 'normal') return '正常'
  if (todayRecord.value.status === 'late') return '迟到'
  if (todayRecord.value.status === 'early_leave') return '早退'
  if (todayRecord.value.status === 'leave') return '请假'
  return '正常'
})

const statusClass = computed(() => {
  if (isOnLeave.value) return 'status-leave'
  if (todayRecord.value?.status === 'normal') return 'status-normal'
  if (todayRecord.value?.status === 'late') return 'status-late'
  if (todayRecord.value?.status === 'early_leave') return 'status-early'
  return 'status-normal'
})

function updateTime() {
  const now = dayjs()
  currentTime.value = now.format('HH:mm:ss')
  todayDate.value = now.format('YYYY年MM月DD日')
  todayWeekday.value = weekdays[now.day()]
}

async function loadTodayData() {
  try {
    const res = await getTodayAttendance()
    todayRecord.value = res.record
    isOnLeave.value = res.is_on_leave
    canClockIn.value = res.can_clock_in
    canClockOut.value = res.can_clock_out
  } catch (error) {
    console.error('加载今日考勤失败:', error)
  }
}

async function handleClockIn() {
  clockingIn.value = true
  try {
    const res = await clockIn()
    ElMessage.success(res.message)
    loadTodayData()
  } catch (error) {
    console.error('上班打卡失败:', error)
  } finally {
    clockingIn.value = false
  }
}

async function handleClockOut() {
  clockingOut.value = true
  try {
    const res = await clockOut()
    ElMessage.success(res.message)
    loadTodayData()
  } catch (error) {
    console.error('下班打卡失败:', error)
  } finally {
    clockingOut.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadTodayData()
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.attendance-clock {
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.clock-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.clock-card {
  width: 450px;
}

.clock-wrapper {
  text-align: center;
  padding: 20px 0;
}

.date-display {
  margin-bottom: 10px;
}

.date-display .date {
  font-size: 18px;
  color: #606266;
  margin-right: 10px;
}

.date-display .weekday {
  font-size: 16px;
  color: #909399;
}

.time-display {
  margin-bottom: 20px;
}

.time-display .time {
  font-size: 56px;
  font-weight: bold;
  color: #303133;
  letter-spacing: 4px;
}

.status-badge {
  display: inline-block;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 30px;
}

.status-normal {
  background: #f0f9eb;
  color: #67C23A;
}

.status-late {
  background: #fdf6ec;
  color: #E6A23C;
}

.status-early {
  background: #fef0f0;
  color: #F56C6C;
}

.status-leave {
  background: #f4f4f5;
  color: #909399;
}

.clock-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.record-info {
  padding: 0 40px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: #909399;
  font-size: 14px;
}

.info-row .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.text-late {
  color: #E6A23C !important;
}

.text-early {
  color: #F56C6C !important;
}

.leave-tip {
  margin-top: 20px;
}
</style>
