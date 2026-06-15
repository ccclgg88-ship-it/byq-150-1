<template>
  <div class="makeup-approval">
    <div class="page-header">
      <h2 class="page-title">补卡审批</h2>
      <div class="header-actions">
        <el-tag :type="'warning'" effect="light">
          待审批：<strong style="margin:0 4px">{{ pendingCount }}</strong> 条
        </el-tag>
        <el-button :icon="Refresh" @click="loadList" :circle="true" />
      </div>
    </div>

    <el-card shadow="never">
      <div class="filter-tabs">
        <el-radio-group v-model="currentTab" size="large" @change="loadList">
          <el-radio-button value="pending">待我审批</el-radio-button>
          <el-radio-button value="done">我已审批</el-radio-button>
        </el-radio-group>
      </div>

      <el-table 
        :data="approvalList" 
        v-loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无审批数据"
      >
        <el-table-column label="申请人" width="130">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" style="background: linear-gradient(135deg,#409EFF,#36d1dc)">
                {{ (row.employee_name || '?').slice(0,1) }}
              </el-avatar>
              <div class="user-info">
                <span class="user-name">{{ row.employee_name }}</span>
                <span class="user-dept">{{ row.department_name }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="makeup_date" label="补卡日期" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.makeup_date }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="补卡类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="makeupTypeTag(row.makeup_type)">
              {{ makeupTypeText(row.makeup_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="补卡时间" width="170">
          <template #default="{ row }">
            <div class="time-group">
              <div v-if="row.clock_in_time" class="time-row">
                <el-icon color="#67c23a"><Sunny /></el-icon>
                <span>{{ row.clock_in_time.slice(0,5) }}</span>
              </div>
              <div v-if="row.clock_out_time" class="time-row">
                <el-icon color="#e6a23c"><Moon /></el-icon>
                <span>{{ row.clock_out_time.slice(0,5) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="补卡原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="当前阶段" width="110">
          <template #default="{ row }">
            <template v-if="currentTab === 'pending'">
              <el-tag size="small" type="warning" effect="dark">
                {{ row.current_level === 1 ? '主管审批' : 'HR审批' }}
              </el-tag>
            </template>
            <template v-else>
              <el-tag size="small" :type="row.status === 'approved' ? 'success' : 'danger'">
                {{ row.status === 'approved' ? '已通过' : (row.status === 'rejected' ? '已驳回' : '已撤销') }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">
            <span class="text-muted">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看</el-button>
            <template v-if="currentTab === 'pending'">
              <el-button type="success" link @click="handleApprove(row)">通过</el-button>
              <el-button type="danger" link @click="handleReject(row)">驳回</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog 
      v-model="detailVisible" 
      title="补卡审批详情" 
      width="640px"
      destroy-on-close
    >
      <div v-if="currentDetail" class="detail-wrap">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">
            {{ currentDetail.employee_name }}
            <el-tag size="small" style="margin-left:8px">{{ currentDetail.department_name }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDate(currentDetail.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="补卡日期">
            <el-tag size="small" type="info">{{ currentDetail.makeup_date }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="补卡类型">
            <el-tag size="small" :type="makeupTypeTag(currentDetail.makeup_type)">
              {{ makeupTypeText(currentDetail.makeup_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.clock_in_time" label="上班时间">
            <el-tag size="small" type="success">{{ currentDetail.clock_in_time }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.clock_out_time" label="下班时间">
            <el-tag size="small" type="warning">{{ currentDetail.clock_out_time }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="补卡原因" :span="2">
            {{ currentDetail.reason || '（未填写）' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.reject_reason" label="驳回原因" :span="2">
            <el-alert type="error" :title="currentDetail.reject_reason" show-icon />
          </el-descriptions-item>
        </el-descriptions>

        <div class="approval-timeline" style="margin-top:20px">
          <el-timeline>
            <el-timeline-item 
              :timestamp="formatDate(currentDetail.created_at)"
              type="primary"
              icon="EditPen"
            >
              <strong>{{ currentDetail.employee_name }}</strong> 提交补卡申请
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.manager_approved_at"
              :timestamp="formatDate(currentDetail.manager_approved_at)"
              type="success"
              icon="User"
            >
              主管审批通过
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.hr_approved_at"
              :timestamp="formatDate(currentDetail.hr_approved_at)"
              type="success"
              icon="Finished"
            >
              HR 审批通过，补卡已生效
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.rejected_at && currentDetail.rejected_by"
              :timestamp="formatDate(currentDetail.rejected_at)"
              type="danger"
              icon="CloseBold"
            >
              被 <strong>{{ currentDetail.rejected_by }}</strong> 驳回：{{ currentDetail.reject_reason }}
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.revoked_at"
              :timestamp="formatDate(currentDetail.revoked_at)"
              type="info"
              icon="RefreshLeft"
            >
              申请人已撤销申请
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <template #footer v-if="currentTab === 'pending' && currentDetail && currentDetail.status === 'pending'">
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="success" @click="handleApprove(currentDetail)">审批通过</el-button>
        <el-button type="danger" @click="handleReject(currentDetail)">驳回申请</el-button>
      </template>
    </el-dialog>

    <el-dialog 
      v-model="rejectVisible" 
      title="驳回补卡申请" 
      width="460px"
      destroy-on-close
    >
      <el-form :model="rejectForm" :rules="rejectRules" ref="rejectFormRef" label-width="80px">
        <el-form-item label="驳回原因" prop="reject_reason">
          <el-input 
            v-model="rejectForm.reject_reason" 
            type="textarea" 
            :rows="4" 
            placeholder="请填写驳回原因（必填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" @click="submitReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Sunny, Moon } from '@element-plus/icons-vue'
import { getPendingMakeups, getPendingMakeupCount, getMakeupDetail, approveMakeup, rejectMakeup } from '@/api/makeup'
import dayjs from 'dayjs'

const loading = ref(false)
const currentTab = ref('pending')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const approvalList = ref([])
const pendingCount = ref(0)

const detailVisible = ref(false)
const currentDetail = ref(null)

const rejectVisible = ref(false)
const rejectTarget = ref(null)
const rejectLoading = ref(false)
const rejectFormRef = ref(null)
const rejectForm = reactive({ reject_reason: '' })

const rejectRules = {
  reject_reason: [{ required: true, message: '请填写驳回原因', trigger: 'blur' }]
}

function makeupTypeText(type) {
  const map = { 'clock_in': '上班卡', 'clock_out': '下班卡', 'all_day': '全天' }
  return map[type] || type
}
function makeupTypeTag(type) {
  const map = { 'clock_in': 'success', 'clock_out': 'warning', 'all_day': 'primary' }
  return map[type] || 'info'
}
function formatDate(d) {
  if (!d) return '-'
  return dayjs(d).format('YYYY-MM-DD HH:mm')
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
      status: currentTab.value === 'pending' ? 'pending' : 'done'
    }
    const res = await getPendingMakeups(params)
    approvalList.value = res.data || res.list || []
    total.value = res.total || 0
    if (currentTab.value === 'pending') {
      const countRes = await getPendingMakeupCount()
      pendingCount.value = countRes.count || 0
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadList()
}

async function viewDetail(row) {
  try {
    currentDetail.value = await getMakeupDetail(row.id)
    detailVisible.value = true
  } catch (err) {
    console.error(err)
  }
}

async function handleApprove(row) {
  try {
    await ElMessageBox.confirm(
      `确认通过 ${row.makeup_date} 的补卡申请吗？通过后对应日期的考勤记录将被更新。`,
      '审批通过确认',
      { type: 'success', confirmButtonText: '通过', cancelButtonText: '取消' }
    )
    await approveMakeup(row.id)
    ElMessage.success('审批通过')
    loadList()
    if (detailVisible.value) detailVisible.value = false
  } catch (err) {
    if (err !== 'cancel') console.error(err)
  }
}

function handleReject(row) {
  rejectTarget.value = row
  rejectForm.reject_reason = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!rejectFormRef.value || !rejectTarget.value) return
  try {
    await rejectFormRef.value.validate()
    rejectLoading.value = true
    await rejectMakeup(rejectTarget.value.id, rejectForm.reject_reason)
    ElMessage.success('已驳回')
    rejectVisible.value = false
    loadList()
    if (detailVisible.value) detailVisible.value = false
  } catch (err) {
    if (err !== false) console.error(err)
  } finally {
    rejectLoading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.makeup-approval { padding: 0; }

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

.filter-tabs {
  margin-bottom: 20px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.user-dept {
  color: #909399;
  margin-top: 2px;
}

.time-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.detail-wrap {
  padding: 5px 0;
}
</style>
