<template>
  <div class="employee-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">员工详情</h2>
      </div>
      <div class="header-actions" v-if="userStore.isHR">
        <el-button type="primary" :icon="EditPen" @click="openEditDialog">编辑员工</el-button>
      </div>
    </div>

    <div v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="info-card">
            <div class="avatar-section">
              <el-avatar :size="100" class="avatar">
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
                <span class="label">联系电话：</span>
                <span class="value">{{ employeeInfo.phone || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">电子邮箱：</span>
                <span class="value">{{ employeeInfo.email || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">年假余额：</span>
                <span class="value highlight">
                  {{ employeeInfo.annual_leave_balance || 0 }}天
                </span>
              </div>
            </div>
          </el-card>

          <el-card v-if="userStore.isHR" style="margin-top:20px" shadow="never">
            <template #header>
              <span style="font-weight:600">假期与考勤摘要</span>
            </template>
            <div v-loading="summaryLoading" class="hr-summary">
              <div class="summary-section">
                <div class="section-title">
                  <el-icon color="#409EFF"><Tickets /></el-icon>
                  <span>年假概况</span>
                </div>
                <div class="summary-item balance">
                  <div class="n">{{ hrSummary.employee?.annual_leave_balance ?? 0 }}</div>
                  <div class="t">年假余额（天）</div>
                </div>
              </div>
              <el-divider style="margin: 10px 0" />
              <div class="summary-section">
                <div class="section-title">
                  <el-icon color="#e6a23c"><Calendar /></el-icon>
                  <span>本月考勤</span>
                </div>
                <div class="mini-grid">
                  <div class="mini-item work"><div class="n">{{ hrSummary.attendance?.work_days || 0 }}</div><div class="t">出勤</div></div>
                  <div class="mini-item late"><div class="n">{{ hrSummary.attendance?.late_days || 0 }}</div><div class="t">迟到</div></div>
                  <div class="mini-item early"><div class="n">{{ hrSummary.attendance?.early_leave_days || 0 }}</div><div class="t">早退</div></div>
                  <div class="mini-item absent"><div class="n">{{ hrSummary.attendance?.absent_days || 0 }}</div><div class="t">缺勤</div></div>
                  <div class="mini-item leave"><div class="n">{{ hrSummary.attendance?.leave_days || 0 }}</div><div class="t">请假</div></div>
                </div>
              </div>
              <el-divider style="margin: 10px 0" />
              <div class="summary-section">
                <div class="section-title">
                  <el-icon color="#F56C6C"><Document /></el-icon>
                  <span>近 3 个月请假</span>
                </div>
                <div class="mini-grid">
                  <div class="mini-item annual">
                    <div class="n">{{ hrSummary.leaves_summary?.annual_days || 0 }}</div>
                    <div class="t">年假</div>
                  </div>
                  <div class="mini-item personal">
                    <div class="n">{{ hrSummary.leaves_summary?.personal_days || 0 }}</div>
                    <div class="t">事假</div>
                  </div>
                  <div class="mini-item sick">
                    <div class="n">{{ hrSummary.leaves_summary?.sick_days || 0 }}</div>
                    <div class="t">病假</div>
                  </div>
                </div>
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
                <el-descriptions-item label="联系电话">{{ employeeInfo.phone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="电子邮箱">{{ employeeInfo.email || '-' }}</el-descriptions-item>
              </el-descriptions>
            </el-tab-pane>
          </el-tabs>
        </el-col>
      </el-row>
    </div>

    <el-dialog 
      v-model="editVisible" 
      title="编辑员工信息" 
      width="620px"
      destroy-on-close
      @close="closeEditDialog"
    >
      <el-form 
        :model="editForm" 
        :rules="editRules" 
        ref="editFormRef" 
        label-width="110px"
      >
        <el-form-item label="工号">
          <el-input :value="employeeInfo.employee_no" disabled />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="所属部门" prop="department_id">
          <el-select 
            v-model="editForm.department_id" 
            placeholder="请选择部门" 
            style="width:100%"
          >
            <el-option 
              v-for="d in departmentList" 
              :key="d.id" 
              :label="d.name" 
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位" prop="position">
          <el-input v-model="editForm.position" placeholder="请输入岗位" />
        </el-form-item>
        <el-form-item label="入职日期" prop="hire_date">
          <el-date-picker 
            v-model="editForm.hire_date" 
            type="date" 
            value-format="YYYY-MM-DD"
            style="width:100%"
            placeholder="选择入职日期"
          />
        </el-form-item>
        <el-form-item label="在职状态" prop="status">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="resigned" />
            <el-option label="停薪留职" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item label="系统角色" prop="role">
          <el-select v-model="editForm.role" style="width:100%">
            <el-option label="普通员工" value="employee" />
            <el-option label="部门主管" value="manager" />
            <el-option label="HR管理员" value="hr" />
          </el-select>
        </el-form-item>
        <el-form-item label="年假余额" prop="annual_leave_balance">
          <el-input-number 
            v-model="editForm.annual_leave_balance" 
            :min="0" 
            :step="1" 
            :precision="0"
            style="width:100%"
            controls-position="right"
          />
          <div class="form-tip">修改入职日期但未填写余额时，系统将根据入职日期自动计算</div>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入联系电话" maxlength="20" />
        </el-form-item>
        <el-form-item label="电子邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeEditDialog">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, EditPen, Tickets, Calendar, Document } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getEmployee, updateEmployee, getEmployeeAttendanceSummary, getEmployeeHRSummary } from '@/api/employee'
import { getDepartmentList } from '@/api/department'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const summaryLoading = ref(false)
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

const hrSummary = ref({})

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const departmentList = ref([])
const editForm = reactive({
  name: '',
  department_id: null,
  position: '',
  hire_date: '',
  status: 'active',
  role: 'employee',
  annual_leave_balance: 0,
  phone: '',
  email: ''
})

const editRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  department_id: [{ required: true, message: '请选择部门', trigger: 'change' }],
  position: [{ required: true, message: '请输入岗位', trigger: 'blur' }],
  hire_date: [{ required: true, message: '请选择入职日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择在职状态', trigger: 'change' }],
  role: [{ required: true, message: '请选择系统角色', trigger: 'change' }],
  annual_leave_balance: [
    { required: true, message: '请输入年假余额', trigger: 'change' },
    { type: 'number', min: 0, message: '年假余额不可为负', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

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

async function loadDepartments() {
  try {
    const res = await getDepartmentList()
    departmentList.value = res.list || res.data || []
  } catch (err) {
    console.error(err)
  }
}

async function openEditDialog() {
  if (!departmentList.value.length) await loadDepartments()

  const e = employeeInfo.value
  Object.assign(editForm, {
    name: e.name || '',
    department_id: e.department_id ?? null,
    position: e.position || '',
    hire_date: e.hire_date || '',
    status: e.status || 'active',
    role: e.role || 'employee',
    annual_leave_balance: Number(e.annual_leave_balance) || 0,
    phone: e.phone || '',
    email: e.email || ''
  })
  editVisible.value = true
}

function closeEditDialog() {
  editVisible.value = false
  if (editFormRef.value) editFormRef.value.resetFields()
}

async function submitEdit() {
  if (!editFormRef.value) return
  try {
    await editFormRef.value.validate()

    if (editForm.status === 'resigned' && employeeInfo.value.status !== 'resigned') {
      try {
        await ElMessageBox.confirm(
          `确定将 ${employeeInfo.value.name} 设置为「离职」状态吗？该操作可能影响该员工后续登录权限。`,
          '设置离职确认',
          { type: 'warning', confirmButtonText: '确认离职', cancelButtonText: '再想想' }
        )
      } catch (_) {
        return
      }
    }

    if (editForm.role === 'manager' && employeeInfo.value.role !== 'manager') {
      const dept = departmentList.value.find(d => d.id === editForm.department_id)
      if (dept && !dept.manager_id) {
        ElMessage.info(`提示：该部门尚无负责人，此员工将自动设为「${dept.name}」负责人`)
      }
    }

    saving.value = true
    await updateEmployee(route.params.id, { ...editForm })
    ElMessage.success('员工信息已更新')
    editVisible.value = false
    await loadEmployeeDetail()
    await loadAttendanceSummary()
    if (userStore.isHR) loadHRSummary()
  } catch (err) {
    if (err !== false && err !== 'cancel') {
      console.error(err)
    }
  } finally {
    saving.value = false
  }
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

async function loadHRSummary() {
  if (!userStore.isHR) return
  summaryLoading.value = true
  try {
    const id = route.params.id
    hrSummary.value = await getEmployeeHRSummary(id)
  } catch (err) {
    console.error(err)
  } finally {
    summaryLoading.value = false
  }
}

onMounted(() => {
  loadEmployeeDetail()
  loadAttendanceSummary()
  if (userStore.isHR) {
    loadDepartments()
    loadHRSummary()
  }
})
</script>

<style scoped>
.employee-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.info-card {
  padding: 20px;
  border-radius: 14px;
  border: none;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.avatar {
  background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
  color: #fff;
  font-size: 38px;
  border: 3px solid rgba(102,126,234,0.15);
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
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.info-item .value.highlight {
  color: #409EFF;
  font-weight: 600;
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
  border-radius: 10px;
  text-align: center;
  color: #fff;
}

.summary-card.normal { background: linear-gradient(135deg,#67C23A 0%,#5db335 100%); }
.summary-card.late { background: linear-gradient(135deg,#E6A23C 0%,#d89532 100%); }
.summary-card.leave { background: linear-gradient(135deg,#909399 0%,#7d8086 100%); }
.summary-card.balance { background: linear-gradient(135deg,#409EFF 0%,#3685d6 100%); }
.summary-card.early-leave { background: linear-gradient(135deg,#F56C6C 0%,#e65a5a 100%); }
.summary-card.absent { background: linear-gradient(135deg,#909399 0%,#606266 100%); }

.summary-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.summary-label {
  font-size: 14px;
  opacity: 0.9;
}

.hr-summary { padding: 8px 4px; }

.summary-section .section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.summary-item.balance {
  padding: 14px;
  text-align: center;
  background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);
  color: #fff;
  border-radius: 10px;
}
.summary-item.balance .n { font-size: 24px; font-weight: 700; }
.summary-item.balance .t { font-size: 12px; opacity: 0.9; }

.mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mini-item {
  padding: 10px 6px;
  border-radius: 8px;
  text-align: center;
  color: #fff;
  transition: transform 0.2s ease;
}
.mini-item:hover { transform: translateY(-1px); }
.mini-item .n { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
.mini-item .t { font-size: 11px; opacity: 0.9; }

.mini-item.work { background: linear-gradient(135deg,#67C23A 0%,#85d45a 100%); }
.mini-item.late { background: linear-gradient(135deg,#E6A23C 0%,#f0be6a 100%); }
.mini-item.early { background: linear-gradient(135deg,#F56C6C 0%,#f89898 100%); }
.mini-item.absent { background: linear-gradient(135deg,#606266 0%,#82848a 100%); }
.mini-item.leave { background: linear-gradient(135deg,#909399 0%,#b1b3b8 100%); }
.mini-item.annual { background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%); }
.mini-item.personal { background: linear-gradient(135deg,#fa709a 0%,#fee140 100%); }
.mini-item.sick { background: linear-gradient(135deg,#f5576c 0%,#ff6a88 100%); }

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
</style>
