<template>
  <div class="department-attendance">
    <div class="page-header">
      <h2 class="page-title">部门考勤汇总</h2>
      <div class="header-actions">
        <el-select 
          v-model="filterDepartment" 
          placeholder="选择部门" 
          clearable
          style="width: 150px; margin-right: 10px"
          @change="loadData"
        >
          <el-option 
            v-for="dept in departments" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.id" 
          />
        </el-select>
        <el-date-picker
          v-model="currentMonth"
          type="month"
          placeholder="选择月份"
          format="YYYY年MM月"
          value-format="YYYY-MM"
          @change="loadData"
        />
        <el-button 
          type="primary" 
          style="margin-left: 10px"
          :icon="Download"
          @click="handleExport"
        >
          导出Excel
        </el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="employee_no" label="工号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" v-if="!filterDepartment" />
        <el-table-column prop="normal_days" label="正常出勤" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #67C23A; font-weight: bold">{{ row.normal_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="late_days" label="迟到" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #E6A23C; font-weight: bold">{{ row.late_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="early_leave_days" label="早退" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #F56C6C; font-weight: bold">{{ row.early_leave_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="leave_days" label="请假" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #909399; font-weight: bold">{{ row.leave_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="absent_days" label="缺勤" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #606266; font-weight: bold">{{ row.absent_days || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_work_hours" label="总工时(h)" width="120" align="center">
          <template #default="{ row }">
            {{ row.total_work_hours || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Download } from '@element-plus/icons-vue'
import { getDepartmentAttendanceSummary } from '@/api/attendance'
import { exportDepartmentAttendance } from '@/api/report'
import { getDepartmentList } from '@/api/department'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const currentMonth = ref(dayjs().format('YYYY-MM'))
const filterDepartment = ref('')
const tableData = ref([])
const departments = ref([])

async function loadDepartments() {
  try {
    const res = await getDepartmentList()
    departments.value = res
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await getDepartmentAttendanceSummary(
      currentMonth.value,
      filterDepartment.value || undefined
    )
    tableData.value = res.list || []
  } catch (error) {
    console.error('获取部门考勤汇总失败:', error)
  } finally {
    loading.value = false
  }
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
    link.setAttribute('download', `考勤明细_${currentMonth.value}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出失败:', error)
  }
}

function viewDetail(row) {
  router.push(`/employees/${row.id}`)
}

onMounted(() => {
  loadDepartments()
  loadData()
})
</script>

<style scoped>
.department-attendance {
  padding: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
