<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="header-left">
        <el-avatar :size="68" class="user-avatar">
          {{ profile.name?.charAt(0) }}
        </el-avatar>
        <div class="user-info">
          <h2 class="user-name">{{ profile.name || '-' }}</h2>
          <p class="user-position">
            {{ profile.position || '-' }}
            <el-tag size="small" :type="statusTag" style="margin-left:10px">
              {{ statusMap[profile.status] }}
            </el-tag>
            <el-tag size="small" type="primary" effect="plain" style="margin-left:6px">
              {{ roleMap[profile.role] }}
            </el-tag>
          </p>
          <p class="user-dept">{{ profile.department_name || '-' }}</p>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="profile-tabs">
      <el-tab-pane label="基本信息" name="basic">
        <el-card shadow="never" class="tab-card">
          <template #header>
            <div class="card-header">
              <span>基本资料</span>
              <el-button 
                type="primary" 
                v-if="!editing" 
                size="default"
                @click="startEdit"
              >
                编辑联系方式
              </el-button>
              <template v-else>
                <el-button @click="cancelEdit">取消</el-button>
                <el-button type="primary" :loading="savingContact" @click="saveContact">保存</el-button>
              </template>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="工号">{{ profile.employee_no }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ profile.name }}</el-descriptions-item>
            <el-descriptions-item label="所属部门">{{ profile.department_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="岗位">{{ profile.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="入职日期">{{ formatDate(profile.hire_date) }}</el-descriptions-item>
            <el-descriptions-item label="在职状态">
              <el-tag :type="statusTag">{{ statusMap[profile.status] }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="系统角色">{{ roleMap[profile.role] }}</el-descriptions-item>
            <el-descriptions-item label="年假余额">
              <span style="color:#409EFF;font-weight:bold">{{ profile.annual_leave_balance || 0 }} 天</span>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              <template v-if="!editing">
                <span v-if="profile.phone" style="color:#606266">{{ profile.phone }}</span>
                <el-tag v-else type="info" size="small" effect="plain">未设置</el-tag>
              </template>
              <template v-else>
                <el-input v-model="editForm.phone" placeholder="请输入联系电话" maxlength="20" style="max-width:260px" />
              </template>
            </el-descriptions-item>
            <el-descriptions-item label="电子邮箱">
              <template v-if="!editing">
                <span v-if="profile.email" style="color:#606266">{{ profile.email }}</span>
                <el-tag v-else type="info" size="small" effect="plain">未设置</el-tag>
              </template>
              <template v-else>
                <el-input v-model="editForm.email" placeholder="请输入邮箱" style="max-width:260px" />
              </template>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="账号安全" name="security">
        <el-card shadow="never" class="tab-card">
          <template #header>
            <div class="card-header">
              <span>修改登录密码</span>
            </div>
          </template>
          <el-form 
            :model="pwdForm" 
            :rules="pwdRules" 
            ref="pwdFormRef" 
            label-width="120px" 
            style="max-width:520px;padding:20px 0"
          >
            <el-form-item label="原密码" prop="old_password">
              <el-input 
                v-model="pwdForm.old_password" 
                type="password" 
                show-password 
                placeholder="请输入原密码"
                autocomplete="off"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="new_password">
              <el-input 
                v-model="pwdForm.new_password" 
                type="password" 
                show-password 
                placeholder="新密码不少于 6 位"
                autocomplete="off"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="new_password2">
              <el-input 
                v-model="pwdForm.new_password2" 
                type="password" 
                show-password 
                placeholder="再次输入新密码"
                autocomplete="off"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="changingPwd" @click="submitChangePwd">
                确认修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="假期概览" name="leave">
        <el-row :gutter="16" style="margin-bottom:20px">
          <el-col :span="6">
            <div class="leave-card balance">
              <div class="value">{{ summary.leave?.annual_balance || 0 }}</div>
              <div class="label">年假余额（天）</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="leave-card used">
              <div class="value">{{ summary.leave?.annual_used || 0 }}</div>
              <div class="label">本年已请年假（天）</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="leave-card personal">
              <div class="value">{{ summary.leave?.personal_total || 0 }}</div>
              <div class="label">本年事假累计（天）</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="leave-card sick">
              <div class="value">{{ summary.leave?.sick_total || 0 }}</div>
              <div class="label">本年病假累计（天）</div>
            </div>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <span>最近请假记录（近 5 条）</span>
          </template>
          <el-table 
            :data="summary.leave?.recent || []" 
            empty-text="暂无请假记录"
            v-loading="loadingSummary"
          >
            <el-table-column label="请假类型" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="leaveTypeTag(row.leave_type)">{{ leaveTypeMap[row.leave_type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="请假时间">
              <template #default="{ row }">
                <span>{{ row.start_date }} 至 {{ row.end_date }}（{{ row.days }}天）</span>
              </template>
            </el-table-column>
            <el-table-column label="申请时间" width="170">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="leaveStatusTag(row.status)">{{ leaveStatusMap[row.status] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <span v-if="row.status === 'rejected'" style="color:#F56C6C">驳回：{{ row.reject_reason || '无原因' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="考勤概览" name="attendance">
        <el-row :gutter="16" style="margin-bottom:20px">
          <el-col :span="4">
            <div class="att-card work">
              <div class="value">{{ summary.attendance?.work_days || 0 }}</div>
              <div class="label">本月出勤</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="att-card late">
              <div class="value">{{ summary.attendance?.late_days || 0 }}</div>
              <div class="label">迟到次数</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="att-card early">
              <div class="value">{{ summary.attendance?.early_leave_days || 0 }}</div>
              <div class="label">早退次数</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="att-card absent">
              <div class="value">{{ summary.attendance?.absent_days || 0 }}</div>
              <div class="label">缺勤次数</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="att-card norecord">
              <div class="value">{{ summary.attendance?.not_recorded || 0 }}</div>
              <div class="label">未打卡</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="att-card total">
              <div class="value">{{ (summary.attendance?.late_days || 0) + (summary.attendance?.early_leave_days || 0) + (summary.attendance?.absent_days || 0) }}</div>
              <div class="label">异常合计</div>
            </div>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <span>最近 7 天考勤</span>
          </template>
          <el-table 
            :data="summary.attendance?.recent || []" 
            empty-text="暂无考勤记录"
            v-loading="loadingSummary"
          >
            <el-table-column label="日期" width="140" prop="record_date" />
            <el-table-column label="上班打卡" width="140">
              <template #default="{ row }">
                <span :class="{'red': !row.clock_in_time}">{{ row.clock_in_time?.slice(0,5) || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="下班打卡" width="140">
              <template #default="{ row }">
                <span :class="{'red': !row.clock_out_time}">{{ row.clock_out_time?.slice(0,5) || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="工作时长(h)" width="140">
              <template #default="{ row }">{{ row.work_hours || 0 }}</template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-tag size="small" :type="attStatusTag(row.status)">{{ attStatusMap[row.status] }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { 
  getProfile, 
  updateContact, 
  updatePassword, 
  getProfileSummary 
} from '@/api/auth'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const loadingSummary = ref(false)
const profile = ref({})
const summary = ref({
  leave: { annual_balance: 0, annual_used: 0, personal_total: 0, sick_total: 0, recent: [] },
  attendance: { work_days: 0, late_days: 0, early_leave_days: 0, absent_days: 0, not_recorded: 0, recent: [] }
})

const activeTab = ref('basic')

const editing = ref(false)
const savingContact = ref(false)
const editForm = reactive({ phone: '', email: '' })

const changingPwd = ref(false)
const pwdFormRef = ref(null)
const pwdForm = reactive({ old_password: '', new_password: '', new_password2: '' })

const validateNew2 = (rule, value, cb) => {
  if (value !== pwdForm.new_password) {
    cb(new Error('两次输入的新密码不一致'))
  } else {
    cb()
  }
}
const pwdRules = {
  old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码不少于 6 位', trigger: 'blur' }
  ],
  new_password2: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateNew2, trigger: 'blur' }
  ]
}

const statusMap = {
  active: '在职',
  resigned: '离职',
  suspended: '停薪留职'
}
const statusTag = computed(() => {
  const map = { active: 'success', resigned: 'danger', suspended: 'warning' }
  return map[profile.value.status] || 'info'
})
const roleMap = { hr: 'HR管理员', manager: '部门主管', employee: '普通员工' }

const leaveTypeMap = { annual: '年假', personal: '事假', sick: '病假' }
const leaveTypeTag = t => ({ annual: 'success', personal: 'warning', sick: 'danger' }[t] || 'info')
const leaveStatusMap = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
const leaveStatusTag = s => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info')

const attStatusMap = {
  normal: '正常', late: '迟到', early_leave: '早退', 
  absent: '缺勤', leave: '请假', weekend: '周末', holiday: '假期', not_recorded: '未打卡'
}
const attStatusTag = s => ({
  normal: 'success', late: 'warning', early_leave: 'danger', 
  absent: 'danger', leave: 'info', weekend: 'info', holiday: 'info', not_recorded: 'warning'
}[s] || 'info')

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'
}

function startEdit() {
  editForm.phone = profile.value.phone || ''
  editForm.email = profile.value.email || ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveContact() {
  savingContact.value = true
  try {
    await updateContact({ phone: editForm.phone || '', email: editForm.email || '' })
    ElMessage.success('联系方式已更新')
    profile.value.phone = editForm.phone
    profile.value.email = editForm.email
    editing.value = false
    loadProfile()
  } catch (err) {
    console.error(err)
  } finally {
    savingContact.value = false
  }
}

async function submitChangePwd() {
  if (!pwdFormRef.value) return
  try {
    await pwdFormRef.value.validate()
    changingPwd.value = true
    await updatePassword(pwdForm.old_password, pwdForm.new_password)
    ElMessageBox.confirm(
      '密码修改成功！请使用新密码重新登录。',
      '登录已失效',
      { showCancelButton: false, type: 'success', confirmButtonText: '去登录' }
    ).then(() => {
      userStore.logout()
      router.replace('/login')
    }).catch(() => {
      userStore.logout()
      router.replace('/login')
    })
  } catch (err) {
    if (err !== false) console.error(err)
  } finally {
    changingPwd.value = false
  }
}

async function loadProfile() {
  loading.value = true
  try {
    profile.value = await getProfile()
    if (!profile.value.annual_leave_balance && profile.value.annual_leave_balance !== 0) {
      profile.value.annual_leave_balance = 0
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  loadingSummary.value = true
  try {
    const res = await getProfileSummary()
    summary.value = res
  } catch (err) {
    console.error(err)
  } finally {
    loadingSummary.value = false
  }
}

onMounted(() => {
  loadProfile()
  loadSummary()
})

watch(activeTab, v => {
  if (v === 'leave' || v === 'attendance') loadSummary()
})
</script>

<style scoped>
.profile-page { padding: 0; }

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.profile-header::after {
  content: '';
  position: absolute;
  right: -50px;
  top: -50px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
}

.profile-header::before {
  content: '';
  position: absolute;
  right: 40px;
  bottom: -80px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.user-avatar {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255,255,255,0.5);
  font-size: 28px;
  color: #fff;
}

.user-info { display: flex; flex-direction: column; gap: 4px; }
.user-name {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}
.user-position {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}
.user-dept {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}

.profile-tabs {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tab-card {
  border-radius: 14px;
  border: none;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.leave-card, .att-card {
  padding: 22px 16px;
  border-radius: 14px;
  color: #fff;
  text-align: center;
  transition: transform 0.25s ease;
  cursor: default;
}
.leave-card:hover, .att-card:hover { transform: translateY(-2px); }

.leave-card .value, .att-card .value {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 6px;
}
.leave-card .label, .att-card .label {
  font-size: 13px;
  opacity: 0.92;
}

.leave-card.balance { background: linear-gradient(135deg,#4facfe 0%,#00f2fe 100%); }
.leave-card.used { background: linear-gradient(135deg,#43e97b 0%,#38f9d7 100%); }
.leave-card.personal { background: linear-gradient(135deg,#fa709a 0%,#fee140 100%); }
.leave-card.sick { background: linear-gradient(135deg,#f5576c 0%,#ff6a88 100%); }

.att-card.work { background: linear-gradient(135deg,#67C23A 0%,#85d45a 100%); }
.att-card.late { background: linear-gradient(135deg,#E6A23C 0%,#f0be6a 100%); }
.att-card.early { background: linear-gradient(135deg,#F56C6C 0%,#f89898 100%); }
.att-card.absent { background: linear-gradient(135deg,#606266 0%,#82848a 100%); }
.att-card.norecord { background: linear-gradient(135deg,#f093fb 0%,#f5576c 100%); }
.att-card.total { background: linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%); }

.red { color: #F56C6C; font-weight: 500; }
</style>
