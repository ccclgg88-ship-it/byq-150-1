<template>
  <div class="reports">
    <div class="page-header">
      <h2 class="page-title">报表统计</h2>
      <el-date-picker
        v-model="currentMonth"
        type="month"
        placeholder="选择月份"
        format="YYYY年MM月"
        value-format="YYYY-MM"
        @change="loadAllData"
      />
    </div>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>部门考勤率排名</span>
            </div>
          </template>
          <div ref="rateChart" style="height: 350px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>请假类型统计</span>
            </div>
          </template>
          <div ref="leaveChart" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>部门考勤明细</span>
          <div>
            <el-select 
              v-model="filterDepartment" 
              placeholder="选择部门" 
              clearable
              style="width: 150px; margin-right: 10px"
            >
              <el-option 
                v-for="dept in departments" 
                :key="dept.id" 
                :label="dept.name" 
                :value="dept.id" 
              />
            </el-select>
            <el-button type="primary" :icon="Download" @click="handleExport">
              导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="departmentData" v-loading="loading" stripe>
        <el-table-column prop="department_name" label="部门" width="150" />
        <el-table-column prop="employee_count" label="员工人数" width="100" align="center" />
        <el-table-column prop="attendance_days" label="出勤天数" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #67C23A; font-weight: bold">{{ row.attendance_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="absent_days" label="缺勤天数" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #F56C6C; font-weight: bold">{{ row.absent_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="leave_days" label="请假天数" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #909399; font-weight: bold">{{ row.leave_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="attendance_rate" label="出勤率" width="120" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.attendance_rate || 0" 
              :stroke-width="12"
              :color="getRateColor(row.attendance_rate)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getDepartmentAttendanceRateReport, getLeaveTypeStatistics, exportDepartmentAttendance } from '@/api/report'
import { getDepartmentList } from '@/api/department'

const currentMonth = ref(dayjs().format('YYYY-MM'))
const filterDepartment = ref('')
const loading = ref(false)
const rateChart = ref(null)
const leaveChart = ref(null)
const departmentData = ref([])
const departments = ref([])

let rateChartInstance = null
let leaveChartInstance = null

function getRateColor(rate) {
  if (rate >= 95) return '#67C23A'
  if (rate >= 85) return '#E6A23C'
  return '#F56C6C'
}

async function loadDepartments() {
  try {
    const res = await getDepartmentList()
    departments.value = res
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

async function loadAllData() {
  loading.value = true
  try {
    const [rateRes, leaveRes] = await Promise.all([
      getDepartmentAttendanceRateReport(currentMonth.value),
      getLeaveTypeStatistics(currentMonth.value)
    ])
    
    departmentData.value = rateRes.list || []
    
    await nextTick()
    initRateChart(rateRes.list || [])
    initLeaveChart(leaveRes.list || [])
  } catch (error) {
    console.error('加载报表数据失败:', error)
  } finally {
    loading.value = false
  }
}

function initRateChart(data) {
  if (!rateChart.value) return
  
  if (!rateChartInstance) {
    rateChartInstance = echarts.init(rateChart.value)
  }
  
  const sortedData = [...data].sort((a, b) => b.attendance_rate - a.attendance_rate)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const item = params[0]
        return `${item.name}<br/>出勤率: ${item.value}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.department_name),
      inverse: true
    },
    series: [{
      type: 'bar',
      data: sortedData.map(d => ({
        value: d.attendance_rate,
        itemStyle: {
          color: d.attendance_rate >= 95 ? '#67C23A' : d.attendance_rate >= 85 ? '#E6A23C' : '#F56C6C'
        }
      })),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%'
      },
      barWidth: 20
    }]
  }
  
  rateChartInstance.setOption(option)
}

function initLeaveChart(data) {
  if (!leaveChart.value) return
  
  if (!leaveChartInstance) {
    leaveChartInstance = echarts.init(leaveChart.value)
  }
  
  const typeMap = {
    'annual': '年假',
    'personal': '事假',
    'sick': '病假'
  }
  
  const colors = ['#409EFF', '#E6A23C', '#F56C6C']
  
  const pieData = data.map((d, index) => ({
    value: d.total_days,
    name: typeMap[d.type] || d.type,
    itemStyle: { color: colors[index % colors.length] }
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}天 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{c}天'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      data: pieData
    }]
  }
  
  leaveChartInstance.setOption(option)
}

async function handleExport() {
  try {
    const blob = await exportDepartmentAttendance(
      currentMonth.value,
      filterDepartment.value || undefined
    )
    
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `部门考勤明细_${currentMonth.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出失败:', error)
  }
}

function handleResize() {
  rateChartInstance?.resize()
  leaveChartInstance?.resize()
}

onMounted(() => {
  loadDepartments()
  loadAllData()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.reports {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
</style>
