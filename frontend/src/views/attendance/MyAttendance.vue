<template>
  <div class="my-attendance">
    <div class="page-header">
      <h2 class="page-title">我的考勤</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="EditPen" @click="openMakeupDialog(null)">
          补卡申请
        </el-button>
        <el-date-picker
          v-model="currentMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY年MM月"
          value-format="YYYY-MM"
          @change="loadData"
        />
      </div>
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
            <div class="card-header-with-tip">
              <span>考勤日历</span>
              <el-tag size="small" type="info" effect="light">
                点击日期可发起补卡
              </el-tag>
            </div>
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
                  'can-makeup': canMakeup(day),
                  [`status-${day.status}`]: !day.isOtherMonth
                }"
                @click="handleDayClick(day)"
              >
                <div class="day-number">{{ day.day }}</div>
                <div class="day-status" v-if="!day.isOtherMonth && day.displayStatus && day.displayStatus !== '未打卡'">
                  {{ day.displayStatus }}
                </div>
                <div class="day-makeup-tip" v-if="canMakeup(day)">
                  <el-icon size="12" color="#f59e0b"><Warning /></el-icon>
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
              <span class="legend-item"><i class="legend-dot absent makeup"></i>可补卡</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog 
      v-model="makeupDialogVisible" 
      :title="makeupDialogTitle" 
      width="520px"
      @close="resetMakeupForm"
      destroy-on-close
    >
      <el-form :model="makeupForm" :rules="makeupRules" ref="makeupFormRef" label-width="100px">
        <el-form-item label="补卡日期" prop="makeup_date">
          <el-date-picker 
            v-model="makeupForm.makeup_date" 
            type="date" 
            placeholder="选择补卡日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled-date="disabledMakeupDate"
          />
        </el-form-item>
        <el-form-item label="补卡类型" prop="makeup_type">
          <el-radio-group v-model="makeupForm.makeup_type">
            <el-radio-button value="clock_in">上班卡</el-radio-button>
            <el-radio-button value="clock_out">下班卡</el-radio-button>
            <el-radio-button value="all_day">全天</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="上班时间" v-if="needClockIn">
          <el-time-picker
            v-model="makeupForm.clock_in_time"
            placeholder="选择时间"
            value-format="HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="下班时间" v-if="needClockOut">
          <el-time-picker
            v-model="makeupForm.clock_out_time"
            placeholder="选择时间"
            value-format="HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="补卡原因" prop="reason">
          <el-input 
            v-model="makeupForm.reason" 
            type="textarea" 
            :rows="3" 
            placeholder="请详细说明补卡原因"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="makeupDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitMakeup">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Sunny, ArrowLeft, ArrowRight, EditPen, Warning } from '@element-plus/icons-vue'
import { getMyAttendance } from '@/api/attendance'
import { applyMakeup } from '@/api/makeup'
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

const makeupDialogVisible = ref(false)
const makeupFormRef = ref(null)
const submitLoading = ref(false)
const preselectedMakeupDate = ref(null)

const makeupForm = reactive({
  makeup_date: '',
  makeup_type: 'clock_in',
  clock_in_time: '',
  clock_out_time: '',
  reason: ''
})

const makeupRules = {
  makeup_date: [{ required: true, message: '请选择补卡日期', trigger: 'change' }],
  makeup_type: [{ required: true, message: '请选择补卡类型', trigger: 'change' }],
  reason: [{ required: true, message: '请填写补卡原因', trigger: 'blur' }]
}

const makeupDialogTitle = computed(() => {
  if (preselectedMakeupDate.value) {
    return `补卡申请 - ${preselectedMakeupDate.value}`
  }
  return '补卡申请'
})

const needClockIn = computed(() => {
  return makeupForm.makeup_type === 'clock_in' || makeupForm.makeup_type === 'all_day'
})

const needClockOut = computed(() => {
  return makeupForm.makeup_type === 'clock_out' || makeupForm.makeup_type === 'all_day'
})

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
      status: record?.status || 'not_recorded',
      displayStatus: record?.displayStatus || '',
      clock_in_time: record?.clock_in_time,
      clock_out_time: record?.clock_out_time
    })
    
    current = current.add(1, 'day')
  }
  
  calendarDays.value = days
}

function canMakeup(day) {
  if (day.isOtherMonth || day.isWeekend || day.isHoliday) return false
  if (day.status === 'normal' || day.status === 'leave') return false
  if (day.status === 'not_recorded') return true
  if (day.status === 'absent') return true
  if (day.status === 'late' || day.status === 'early_leave') {
    if (!day.clock_in_time || !day.clock_out_time) return true
  }
  return false
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

function handleDayClick(day) {
  if (day.isOtherMonth) return
  if (canMakeup(day)) {
    openMakeupDialog(day.date)
  }
}

function openMakeupDialog(date) {
  preselectedMakeupDate.value = date
  resetMakeupForm()
  if (date) {
    makeupForm.makeup_date = date
  }
  makeupDialogVisible.value = true
}

function resetMakeupForm() {
  makeupForm.makeup_date = preselectedMakeupDate.value || ''
  makeupForm.makeup_type = 'clock_in'
  makeupForm.clock_in_time = ''
  makeupForm.clock_out_time = ''
  makeupForm.reason = ''
  if (makeupFormRef.value) {
    makeupFormRef.value.resetFields()
  }
}

function disabledMakeupDate(date) {
  const target = dayjs(date)
  const today = dayjs()
  if (target.isAfter(today, 'day')) return true
  const dayOfWeek = target.day()
  if (dayOfWeek === 0 || dayOfWeek === 6) return true
  return false
}

async function submitMakeup() {
  if (!makeupFormRef.value) return
  
  try {
    await makeupFormRef.value.validate()
    
    if (needClockIn.value && !makeupForm.clock_in_time) {
      ElMessage.warning('请填写上班时间')
      return
    }
    if (needClockOut.value && !makeupForm.clock_out_time) {
      ElMessage.warning('请填写下班时间')
      return
    }
    
    submitLoading.value = true
    const payload = {
      makeup_date: makeupForm.makeup_date,
      makeup_type: makeupForm.makeup_type,
      reason: makeupForm.reason,
      clock_in_time: needClockIn.value ? makeupForm.clock_in_time : undefined,
      clock_out_time: needClockOut.value ? makeupForm.clock_out_time : undefined
    }
    await applyMakeup(payload)
    ElMessage.success('补卡申请提交成功，请等待审批')
    makeupDialogVisible.value = false
  } catch (error) {
    if (error !== false) {
      console.error('提交补卡申请失败:', error)
    }
  } finally {
    submitLoading.value = false
  }
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header-with-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  cursor: default;
  transition: all 0.25s ease;
  position: relative;
}

.day-item.can-makeup {
  cursor: pointer;
}

.day-item.can-makeup:hover {
  background: #fff7e6 !important;
  transform: scale(1.05);
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2);
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

.day-item.status-not_recorded.can-makeup:not(.other-month) {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border: 1px dashed #f59e0b;
}

.day-number {
  font-weight: 500;
}

.day-status {
  font-size: 10px;
  margin-top: 2px;
}

.day-makeup-tip {
  position: absolute;
  top: 4px;
  right: 4px;
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  flex-wrap: wrap;
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
.legend-dot.absent.makeup { background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%); border: 1px dashed #f59e0b; }
</style>
