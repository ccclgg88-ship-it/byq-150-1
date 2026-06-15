<template>
  <div class="leave-apply">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <h2 class="page-title">申请请假</h2>
      </div>
    </div>

    <el-card class="form-card">
      <el-form 
        :model="leaveForm" 
        :rules="rules" 
        ref="leaveFormRef" 
        label-width="100px"
        style="max-width: 600px; margin: 0 auto;"
      >
        <el-form-item label="请假类型" prop="leave_type">
          <el-radio-group v-model="leaveForm.leave_type">
            <el-radio label="annual">年假</el-radio>
            <el-radio label="personal">事假</el-radio>
            <el-radio label="sick">病假</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker
            v-model="leaveForm.start_date"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>

        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker
            v-model="leaveForm.end_date"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>

        <el-form-item label="请假天数">
          <span style="font-size: 18px; font-weight: bold; color: #409EFF">
            {{ calculatedDays }} 天
          </span>
          <span style="color: #909399; margin-left: 10px; font-size: 12px">
            (不含周末)
          </span>
        </el-form-item>

        <el-form-item label="事由" prop="reason">
          <el-input
            v-model="leaveForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入请假事由"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item v-if="leaveForm.leave_type === 'annual'">
          <div class="balance-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>您当前年假余额：<b>{{ annualBalance }}</b> 天</span>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            提交申请
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue'
import { applyLeave } from '@/api/leave'
import { getProfile } from '@/api/auth'
import dayjs from 'dayjs'

const router = useRouter()

const leaveFormRef = ref(null)
const submitting = ref(false)
const annualBalance = ref(0)

const leaveForm = reactive({
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  reason: ''
})

const rules = {
  leave_type: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入请假事由', trigger: 'blur' }]
}

const calculatedDays = computed(() => {
  if (!leaveForm.start_date || !leaveForm.end_date) return 0
  
  const start = dayjs(leaveForm.start_date)
  const end = dayjs(leaveForm.end_date)
  
  if (start.isAfter(end)) return 0
  
  let count = 0
  let current = start
  
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const day = current.day()
    if (day !== 0 && day !== 6) {
      count++
    }
    current = current.add(1, 'day')
  }
  
  return count
})

function disabledDate(time) {
  return time.getTime() < Date.now() - 8.64e7
}

async function loadProfile() {
  try {
    const res = await getProfile()
    annualBalance.value = res.annual_leave_balance || 0
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

async function handleSubmit() {
  if (!leaveFormRef.value) return
  
  try {
    await leaveFormRef.value.validate()
    
    if (calculatedDays.value === 0) {
      ElMessage.warning('请假日期不能全是周末')
      return
    }
    
    if (leaveForm.leave_type === 'annual' && calculatedDays.value > annualBalance.value) {
      ElMessage.warning(`年假余额不足，剩余${annualBalance.value}天`)
      return
    }
    
    submitting.value = true
    
    await applyLeave({
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason
    })
    
    ElMessage.success('申请提交成功')
    router.push('/leave')
  } catch (error) {
    console.error('提交申请失败:', error)
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.leave-apply {
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.form-card {
  max-width: 700px;
  margin: 0 auto;
}

.balance-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: #ecf5ff;
  border-radius: 6px;
  color: #409EFF;
  font-size: 14px;
}

.balance-tip b {
  font-size: 16px;
}
</style>
