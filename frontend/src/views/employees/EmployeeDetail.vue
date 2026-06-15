<template>
  <div class="employee-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">员工详情</h2>
      </div>
      <div class="header-actions" v-if="userStore.isHR">
        <el-button type="primary" @click="handleEdit">编辑</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="info-card">
            <div class="avatar-section">
              <el-avatar :size="100" style="background-color: #409EFF; font-size: 36px">
                {{ employeeInfo.name?.charAt(0) }}
              </el-avatar>
              <div class="name-section">
                <h3>{{ employeeInfo.name }}</h3>
                <p>{{ employeeInfo.position }}</p>
                <el-tag :type="statusTypeMap[employeeInfo.status]" size="large">
                  {{ statusMap[employeeInfo.status] }}
                </el-tag>
              </div>
            </div>
            <el-divider />
            <div class="info-list">
              <div class="info-item">
                <span class="label">工号：</span>
                <span class="value">{{ employeeInfo.employee_no }}</span>
              </div>
              <div class="info-item">
                <span class="label">部门：</span>
                <span class="value">{{ employeeInfo.department_name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">岗位：</span>
                <span class="value">{{ employeeInfo.position || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">入职日期：</span>
                <span class="value">{{ formatDate(employeeInfo.hire_date) }}</span>
              </div>
              <div class="info-item">
                <span class="label">角色：</span>
                <span class="value">{{ roleMap[employeeInfo.role] }}</span>
              </div>
              <div class="info-item">
                <span class="label">年假余额：</span>
                <span class="value" style="color: #409EFF; font-weight: bold">
                  {{ employeeInfo.annual_leave_balance || 0 }}天
                </span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="16">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="考勤摘要" name="attendance">
              <div class="attendance-summary">
                <div class="summary-header">
                  <el-date-picker
                    v-model="currentMonth"
                    type="month"
                    placeholder="选择月份"
                    format="YYYY年MM月"
                    value-format="YYYY-MM"
                    size="default"
                    @change="loadAttendanceSummary"
                  />
                </div>
                
                <el-row :gutter="20" style="margin-top: 20px">
                  <el-col :span="6">
                    <div class="summary-card normal">
                      <div class="summary-value">{{ summary.work_days || 0 }}</div>
                      <div class="summary-label">出勤天数</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="summary-card late">
                      <div class="summary-value">{{ summary.late_days || 0 }}</div>
                      <div class="summary-label">迟到次数</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="summary-card leave">
                      <div class="summary-value">{{ summary.leave_days || 0 }}</div>
                      <div class="summary-label">请假天数</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="summary-card balance">
                      <div class="summary-value">{{ summary.annual_leave_balance || 0 }}</div>
                      <div class="summary-label">剩余年假</div>
                    </div>
                  </el-col>
                </el-row>

                <el-row :gutter="20" style="margin-top: 20px">
                  <el-col :span="6">
                    <div class="summary-card early-leave">
                      <div class="summary-value">{{ summary.early_leave_days || 0 }}</div>
                      <div class="summary-label">早退次数</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="summary-card absent">
                      <div class="summary-value">{{ summary.absent_days || 0 }}</div>
                      <div class="summary-label">缺勤天数</div>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="基本信息" name="basic">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="工号">{{ employeeInfo.employee_no }}</el-descriptions-item>
                <el-descriptions-item label="姓名">{{ employeeInfo.name }}</el-descriptions-item>
                <el-descriptions-item label="部门">{{ employeeInfo.department_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="岗位">{{ employeeInfo.position || '-' }}</el-descriptions-item>
                <el-descriptions-item label="入职日期">{{ formatDate(employeeInfo.hire_date) }}</el-descriptions-item>
                <el-descriptions-item label="在职状态">
                  <el-tag :type="statusTypeMap[employeeInfo.status]">
                    {{ statusMap[employeeInfo.status] }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="系统角色">{{ roleMap[employeeInfo.role] }}</el-descriptions-item>
                <el-descriptions-item label="年假余额">{{ employeeInfo.annual_leave_balance || 0 }}天</el-descriptions-item>
              </el-descriptions>
            </el-tab-pane>
          </el-tabs>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getEmployee, getEmployeeAttendanceSummary } from '@/api/employee'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const activeTab = ref('attendance')
const employeeInfo = ref({})
const summary = reactive({
  work_days: 0,
  late_days: 0,
  leave_days: 0,
  annual_leave_balance: 0,
  early_leave_days: 0,
  absent_days: 0
})
const currentMonth = ref(dayjs().format('YYYY-MM'))

const statusMap = {
  active: '在职',
  resigned: '离职',
  suspended: '停薪留职'
}

const statusTypeMap = {
  active: 'success',
  resigned: 'danger',
  suspended: 'warning'
}

const roleMap = {
  hr: 'HR管理员',
  manager: '部门主管',
  employee: '普通员工'
}

function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function goBack() {
  router.back()
}

function handleEdit() {
  // 可以跳转到编辑页面或者打开编辑弹窗
  ElMessage.info('编辑功能开发中')
}

async function loadEmployeeDetail() {
  loading.value = true
  try {
    const id = route.params.id
    const res = await getEmployee(id)
    employeeInfo.value = res
  } catch (error) {
    console.error('获取员工详情失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadAttendanceSummary() {
  try {
    const id = route.params.id
    const res = await getEmployeeAttendanceSummary(id, currentMonth.value)
    Object.assign(summary, res)
  } catch (error) {
    console.error('获取考勤摘要失败:', error)
  }
}

onMounted(() => {
  loadEmployeeDetail()
  loadAttendanceSummary()
})
</script>

<style scoped>
.employee-detail {
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.info-card {
  padding: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.name-section {
  text-align: center;
  margin-top: 15px;
}

.name-section h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
  color: #303133;
}

.name-section p {
  margin: 0 0 10px 0;
  color: #909399;
  font-size: 14px;
}

.info-list {
  padding: 0 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #909399;
  font-size: 14px;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
}

.attendance-summary {
  padding: 10px 0;
}

.summary-header {
  display: flex;
  justify-content: flex-end;
}

.summary-card {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: #fff;
}

.summary-card.normal {
  background: linear-gradient(135deg, #67C23A 0%, #5db335 100%);
}

.summary-card.late {
  background: linear-gradient(135deg, #E6A23C 0%, #d89532 100%);
}

.summary-card.leave {
  background: linear-gradient(135deg, #909399 0%, #7d8086 100%);
}

.summary-card.balance {
  background: linear-gradient(135deg, #409EFF 0%, #3685d6 100%);
}

.summary-card.early-leave {
  background: linear-gradient(135deg, #F56C6C 0%, #e65a5a 100%);
}

.summary-card.absent {
  background: linear-gradient(135deg, #909399 0%, #606266 100%);
}

.summary-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.summary-label {
  font-size: 14px;
  opacity: 0.9;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}
</style>
