<template>
  <div class="makeup-apply">
    <div class="page-header">
      <h2 class="page-title">申请补卡</h2>
      <el-button :icon="ArrowLeft" @click="router.back()">返回</el-button>
    </div>

    <el-card shadow="never">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="apply-alert"
        title="补卡说明"
        description="支持对未打卡、缺勤、仅单侧打卡日期发起补卡申请；补卡需经主管及HR两级审批，审批通过后将自动更新对应日期的考勤记录。"
      />
      
      <el-form 
        :model="form" 
        :rules="rules" 
        ref="formRef" 
        label-width="110px"
        class="apply-form"
      >
        <el-form-item label="补卡日期" prop="makeup_date">
          <el-date-picker 
            v-model="form.makeup_date" 
            type="date" 
            placeholder="选择补卡日期"
            value-format="YYYY-MM-DD"
            style="width: 320px"
            :disabled-date="disabledMakeupDate"
          />
          <div class="tip-text">支持补过去 60 天内的工作日考勤</div>
        </el-form-item>

        <el-form-item label="补卡类型" prop="makeup_type">
          <el-radio-group v-model="form.makeup_type">
            <el-radio-button value="clock_in">
              <el-icon><Sunny /></el-icon> 上班卡
            </el-radio-button>
            <el-radio-button value="clock_out">
              <el-icon><Moon /></el-icon> 下班卡
            </el-radio-button>
            <el-radio-button value="all_day">
              <el-icon><Sunrise /></el-icon> 全天
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="上班时间" v-if="needClockIn" prop="clock_in_time">
          <el-time-picker
            v-model="form.clock_in_time"
            placeholder="选择上班时间"
            value-format="HH:mm:ss"
            style="width: 320px"
            format="HH:mm"
          />
        </el-form-item>

        <el-form-item label="下班时间" v-if="needClockOut" prop="clock_out_time">
          <el-time-picker
            v-model="form.clock_out_time"
            placeholder="选择下班时间"
            value-format="HH:mm:ss"
            style="width: 320px"
            format="HH:mm"
          />
        </el-form-item>

        <el-form-item label="补卡原因" prop="reason">
          <el-input 
            v-model="form.reason" 
            type="textarea" 
            :rows="4" 
            placeholder="请详细说明补卡原因，将作为审批依据"
            maxlength="200"
            show-word-limit
            style="width: 100%; max-width: 600px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" :loading="submitLoading" @click="submitForm">
            <el-icon style="margin-right:6px"><EditPen /></el-icon>
            提交补卡申请
          </el-button>
          <el-button size="large" @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, 
  Sunny, 
  Moon, 
  Sunrise, 
  EditPen 
} from '@element-plus/icons-vue'
import { applyMakeup } from '@/api/makeup'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const submitLoading = ref(false)

const form = reactive({
  makeup_date: '',
  makeup_type: 'clock_in',
  clock_in_time: '',
  clock_out_time: '',
  reason: ''
})

const rules = {
  makeup_date: [{ required: true, message: '请选择补卡日期', trigger: 'change' }],
  makeup_type: [{ required: true, message: '请选择补卡类型', trigger: 'change' }],
  clock_in_time: [{ required: true, message: '请选择上班补卡时间', trigger: 'change' }],
  clock_out_time: [{ required: true, message: '请选择下班补卡时间', trigger: 'change' }],
  reason: [
    { required: true, message: '请填写补卡原因', trigger: 'blur' },
    { min: 5, message: '补卡原因至少 5 个字', trigger: 'blur' }
  ]
}

const needClockIn = computed(() => 
  form.makeup_type === 'clock_in' || form.makeup_type === 'all_day'
)

const needClockOut = computed(() => 
  form.makeup_type === 'clock_out' || form.makeup_type === 'all_day'
)

function disabledMakeupDate(date) {
  const target = dayjs(date)
  const today = dayjs()
  if (target.isAfter(today, 'day')) return true
  if (target.isBefore(today.subtract(60, 'day'), 'day')) return true
  const dayOfWeek = target.day()
  return dayOfWeek === 0 || dayOfWeek === 6
}

async function submitForm() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    const payload = {
      makeup_date: form.makeup_date,
      makeup_type: form.makeup_type,
      reason: form.reason
    }
    if (needClockIn.value) payload.clock_in_time = form.clock_in_time
    if (needClockOut.value) payload.clock_out_time = form.clock_out_time

    await applyMakeup(payload)
    ElMessage.success('补卡申请提交成功，请等待审批')
    setTimeout(() => router.push('/makeup'), 800)
  } catch (err) {
    if (err !== false) console.error(err)
  } finally {
    submitLoading.value = false
  }
}

function resetForm() {
  if (formRef.value) formRef.value.resetFields()
  Object.assign(form, {
    makeup_date: route.query.date || '',
    makeup_type: 'clock_in',
    clock_in_time: '',
    clock_out_time: '',
    reason: ''
  })
}

onMounted(() => {
  if (route.query.date) {
    form.makeup_date = route.query.date
  }
})
</script>

<style scoped>
.makeup-apply { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.apply-alert {
  margin-bottom: 28px;
}

.apply-form {
  max-width: 760px;
  padding: 0 10px;
}

.tip-text {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  padding-left: 4px;
}
</style>
