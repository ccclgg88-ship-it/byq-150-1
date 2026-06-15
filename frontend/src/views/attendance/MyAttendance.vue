<template>
  <div class="my-attendance">
    <div class="page-header">
      <h2 class="page-title">我的考勤</h2>
      <el-date-picker
        v-model="currentMonth"
        type="month"
        placeholder="选择月份"
        format="YYYY年MM月"
        value-format="YYYY-MM"
        @change="loadData"
      />
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <div class="clock-card">
            <div class="current-time">{{ currentTime }}</div>
            <div class="current-date">{{ currentDate }}</div>
            <div class="clock-actions">
              <el-button 
                type="primary" 
                size="large" 
                :icon="Sunny"
                @click="goToClock"
                style="width: 100%; margin-bottom: 10px"
              >
                立即打卡
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>本月统计</span>
          </template>
          <div class="stats-grid">
            <div class="stat-item normal">
              <div class="stat-num">{{ summary.normal_days || 0 }}</div>
              <div class="stat-label">正常出勤</div>
            </div>
            <div class="stat-item late">
              <div class="stat-num">{{ summary.late_days || 0 }}</div>
              <div class="stat-label">迟到</div>
            </div>
            <div class="stat-item early">
              <div class="stat-num">{{ summary.early_leave_days || 0 }}</div>
              <div class="stat-label">早退</div>
            </div>
            <div class="stat-item leave">
              <div class="stat-num">{{ summary.leave_days || 0 }}</div>
              <div class="stat-label">请假</div>
            </div>
            <div class="stat-item absent">
              <div class="stat-num">{{ summary.absent_days || 0 }}</div>
              <div class="stat-label">缺勤</div>
            </div>
            <div class="stat-item total">
              <div class="stat-num">{{ summary.total_work_days || 0 }}</div>
              <div class="stat-label">总工作日</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <span>考勤日历</span>
          </template>
          <div class="calendar">
            <div class="calendar-header">
              <el-button :icon="ArrowLeft" circle size="small" @click="prevMonth" />
              <span class="month-title">{{ currentMonth }}</span>
              <el-button :icon="ArrowRight" circle size="small" @click="nextMonth" />
            </div>
            <div class="weekdays">
              <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
            </div>
            <div class="days">
              <div 
                v-for="(day, index) in calendarDays" 
                :key="index"
                class="day-item"
                :class="{
                  'other-month': day.isOtherMonth,
                  'is-today': day.isToday,
                  'weekend': day.isWeekend,
                  'holiday': day.isHoliday,
                  [`status-${day.status}`]: !day.isOtherMonth
                }"
              >
                <div class="day-number">{{ day.day }}</div>
                <div class="day-status" v-if="!day.isOtherMonth && day.displayStatus && day.displayStatus !== '未打卡'">
                  {{ day.displayStatus }}
                </div>
              </div>
            </div>
            <div class="calendar-legend">
              <span class="legend-item"><i class="legend-dot normal"></i>正常</span>
              <span class="legend-item"><i class="legend-dot late"></i>迟到</span>
              <span class="legend-item"><i class="legend-dot early_leave"></i>早退</span>
              <span class="legend-item"><i class="legend-dot leave"></i>请假</span>
              <span class="legend-item"><i class="legend-dot absent"></i>缺勤</span>
              <span class="legend-item"><i class="legend-dot weekend"></i>周末/假期</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sunny, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { getMyAttendance } from '@/api/attendance'
import dayjs from 'dayjs'

const router = useRouter()

const currentMonth = ref(dayjs().format('YYYY-MM'))
const currentTime = ref('')
const currentDate = ref('')
const calendarDays = ref([])
const summary = reactive({
  normal_days: 0,
  late_days: 0,
  early_leave_days: 0,
  leave_days: 0,
  absent_days: 0,
  total_work_days: 0
})

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

let timer = null

function updateTime() {
  const now = dayjs()
  currentTime.value = now.format('HH:mm:ss')
  currentDate.value = now.format('YYYY年MM月DD日 dddd')
}

function generateCalendar(attendanceData) {
  const yearMonth = currentMonth.value
  const firstDay = dayjs(yearMonth + '-01')
  const lastDay = firstDay.endOf('month')
  const startDay = firstDay.startOf('week')
  const endDay = lastDay.endOf('week')
  
  const days = []
  let current = startDay
  
  const recordMap = {}
  attendanceData.forEach(item => {
    recordMap[dayjs(item.date).format('YYYY-MM-DD')] = item
  })
  
  while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
    const dateStr = current.format('YYYY-MM-DD')
    const isOtherMonth = current.month() !== firstDay.month()
    const isToday = current.isSame(dayjs(), 'day')
    const isWeekend = current.day() === 0 || current.day() === 6
    const record = recordMap[dateStr]
    
    days.push({
      day: current.date(),
      date: dateStr,
      isOtherMonth,
      isToday,
      isWeekend: isWeekend || record?.isHoliday,
      isHoliday: record?.isHoliday || false,
      status: record?.status || 'normal',
      displayStatus: record?.displayStatus || ''
    })
    
    current = current.add(1, 'day')
  }
  
  calendarDays.value = days
}

async function loadData() {
  try {
    const res = await getMyAttendance(currentMonth.value)
    Object.assign(summary, res.summary)
    generateCalendar(res.calendar)
  } catch (error) {
    console.error('加载考勤数据失败:', error)
  }
}

function prevMonth() {
  currentMonth.value = dayjs(currentMonth.value).subtract(1, 'month').format('YYYY-MM')
  loadData()
}

function nextMonth() {
  currentMonth.value = dayjs(currentMonth.value).add(1, 'month').format('YYYY-MM')
  loadData()
}

function goToClock() {
  router.push('/attendance/clock')
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadData()
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.my-attendance {
  padding: 0;
}

.clock-card {
  text-align: center;
  padding: 24px 0;
}

.current-time {
  font-size: 40px;
  font-weight: 800;
  background: linear-gradient(135deg, #409EFF 0%, #36d1dc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.current-date {
  font-size: 14px;
  color: #909399;
  margin-bottom: 25px;
}

.clock-actions {
  padding: 0 20px;
}

.clock-actions .el-button {
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.clock-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 16px 8px;
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-num {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #fff;
  opacity: 0.9;
}

.stat-item.normal {
  background: linear-gradient(135deg, #67C23A 0%, #85d45a 100%);
  color: #fff;
}

.stat-item.late {
  background: linear-gradient(135deg, #E6A23C 0%, #f0be6a 100%);
  color: #fff;
}

.stat-item.early {
  background: linear-gradient(135deg, #F56C6C 0%, #f89898 100%);
  color: #fff;
}

.stat-item.leave {
  background: linear-gradient(135deg, #909399 0%, #b1b3b8 100%);
  color: #fff;
}

.stat-item.absent {
  background: linear-gradient(135deg, #606266 0%, #82848a 100%);
  color: #fff;
}

.stat-item.total {
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
  color: #fff;
}

.stat-item.normal .stat-num,
.stat-item.late .stat-num,
.stat-item.early .stat-num,
.stat-item.leave .stat-num,
.stat-item.absent .stat-num,
.stat-item.total .stat-num {
  color: #fff;
}

.calendar {
  padding: 10px 0;
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 600;
  color: #606266;
  padding: 10px 0;
  border-bottom: 2px solid #ebeef5;
}

.weekday {
  font-size: 14px;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 10px 0;
}

.day-item {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.day-item:hover {
  background: #ecf5ff;
  transform: scale(1.05);
}

.day-item.other-month {
  color: #c0c4cc;
}

.day-item.is-today {
  border: 2px solid #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.day-item.weekend,
.day-item.holiday {
  background: #f0f2f5;
  color: #909399;
}

.day-item.status-normal:not(.weekend):not(.holiday):not(.other-month) {
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d0 100%);
}

.day-item.status-late:not(.other-month) {
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
}

.day-item.status-early_leave:not(.other-month) {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
}

.day-item.status-leave:not(.other-month) {
  background: linear-gradient(135deg, #f4f4f5 0%, #e9e9eb 100%);
}

.day-item.status-absent:not(.other-month) {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border: 1px dashed #F56C6C;
}

.day-number {
  font-weight: 500;
}

.day-status {
  font-size: 10px;
  margin-top: 2px;
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}

.legend-dot.normal { background: linear-gradient(135deg, #67C23A 0%, #85d45a 100%); }
.legend-dot.late { background: linear-gradient(135deg, #E6A23C 0%, #f0be6a 100%); }
.legend-dot.early_leave { background: linear-gradient(135deg, #F56C6C 0%, #f89898 100%); }
.legend-dot.leave { background: linear-gradient(135deg, #909399 0%, #b1b3b8 100%); }
.legend-dot.absent { background: linear-gradient(135deg, #606266 0%, #82848a 100%); border: 1px dashed #F56C6C; }
.legend-dot.weekend { background: linear-gradient(135deg, #c0c4cc 0%, #d3d4d6 100%); }
</style>
