<template>
  <div class="my-makeup">
    <div class="page-header">
      <h2 class="page-title">我的补卡</h2>
      <el-button type="primary" :icon="EditPen" @click="router.push('/makeup/apply')">
        申请补卡
      </el-button>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-radio-group v-model="filterStatus" @change="loadData" size="large">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="pending">待审批</el-radio-button>
          <el-radio-button value="approved">已通过</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
          <el-radio-button value="revoked">已撤销</el-radio-button>
        </el-radio-group>
      </div>

      <el-table 
        :data="makeupList" 
        v-loading="loading"
        stripe 
        style="width: 100%"
        empty-text="暂无补卡记录"
      >
        <el-table-column prop="makeup_date" label="补卡日期" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.makeup_date }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="makeup_type" label="补卡类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="makeupTypeTag(row.makeup_type)">
              {{ makeupTypeText(row.makeup_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="补卡时间" width="180">
          <template #default="{ row }">
            <div class="time-column">
              <span v-if="row.clock_in_time" class="time-item in">上班 {{ row.clock_in_time.slice(0,5) }}</span>
              <span v-if="row.clock_out_time" class="time-item out">下班 {{ row.clock_out_time.slice(0,5) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="补卡原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">
              <template v-if="row.status === 'pending'">
                {{ row.current_level === 1 ? '待主管审批' : '待HR审批' }}
              </template>
              <template v-else>{{ statusText(row.status) }}</template>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">
            <span class="text-muted">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button 
              type="danger" 
              link 
              v-if="row.status === 'pending'"
              @click="handleRevoke(row)"
            >撤销</el-button>
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
      title="补卡申请详情" 
      width="620px"
      destroy-on-close
    >
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="补卡日期">
            <el-tag size="small" type="info">{{ currentDetail.makeup_date }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="补卡类型">
            <el-tag size="small" :type="makeupTypeTag(currentDetail.makeup_type)">
              {{ makeupTypeText(currentDetail.makeup_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="statusTag(currentDetail.status)">
              <template v-if="currentDetail.status === 'pending'">
                {{ currentDetail.current_level === 1 ? '待主管审批' : '待HR审批' }}
              </template>
              <template v-else>{{ statusText(currentDetail.status) }}</template>
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDate(currentDetail.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.clock_in_time" label="上班补卡">
            <el-tag size="small" type="success">{{ currentDetail.clock_in_time }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.clock_out_time" label="下班补卡">
            <el-tag size="small" type="warning">{{ currentDetail.clock_out_time }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="补卡原因" :span="2">
            {{ currentDetail.reason || '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.reject_reason" label="驳回原因" :span="2">
            <el-alert type="error" :title="currentDetail.reject_reason" show-icon />
          </el-descriptions-item>
        </el-descriptions>

        <div class="approval-progress">
          <el-steps :active="approvalActive" finish-status="success" process-status="wait">
            <el-step title="提交申请" />
            <el-step title="主管审批">
              <template #description>
                <span v-if="currentDetail.manager_approved_at" class="time-desc">
                  {{ formatDate(currentDetail.manager_approved_at) }}
                </span>
              </template>
            </el-step>
            <el-step title="HR审批">
              <template #description>
                <span v-if="currentDetail.hr_approved_at" class="time-desc">
                  {{ formatDate(currentDetail.hr_approved_at) }}
                </span>
              </template>
            </el-step>
          </el-steps>
        </div>

        <div class="timeline">
          <el-timeline>
            <el-timeline-item 
              :timestamp="formatDate(currentDetail.created_at)"
              type="primary"
              icon="EditPen"
            >
              提交补卡申请
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.manager_approved_at"
              :timestamp="formatDate(currentDetail.manager_approved_at)"
              type="success"
              icon="User"
            >
              主管已审批通过
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.rejected_at && currentDetail.rejected_by"
              :timestamp="formatDate(currentDetail.rejected_at)"
              type="danger"
              icon="CloseBold"
            >
              被 {{ currentDetail.rejected_by }} 驳回：{{ currentDetail.reject_reason || '无原因' }}
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.revoked_at"
              :timestamp="formatDate(currentDetail.revoked_at)"
              type="info"
              icon="RefreshLeft"
            >
              已撤销申请
            </el-timeline-item>
            <el-timeline-item 
              v-if="currentDetail.hr_approved_at"
              :timestamp="formatDate(currentDetail.hr_approved_at)"
              type="success"
              icon="Finished"
            >
              HR 审批通过，补卡生效
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { getMyMakeups, getMakeupDetail, revokeMakeup } from '@/api/makeup'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const filterStatus = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const makeupList = ref([])

const detailVisible = ref(false)
const currentDetail = ref(null)

const approvalActive = computed(() => {
  if (!currentDetail.value) return 0
  if (currentDetail.value.status === 'revoked') return 0
  if (currentDetail.value.status === 'rejected') return 1
  if (currentDetail.value.status === 'pending') {
    return currentDetail.value.current_level === 1 ? 1 : 2
  }
  if (currentDetail.value.status === 'approved') return 3
  return 0
})

function makeupTypeText(type) {
  const map = {
    'clock_in': '上班卡',
    'clock_out': '下班卡',
    'all_day': '全天'
  }
  return map[type] || type
}

function makeupTypeTag(type) {
  const map = {
    'clock_in': 'success',
    'clock_out': 'warning',
    'all_day': 'primary'
  }
  return map[type] || 'info'
}

function statusText(status) {
  const map = {
    'pending': '待审批',
    'approved': '已通过',
    'rejected': '已驳回',
    'revoked': '已撤销'
  }
  return map[status] || status
}

function statusTag(status) {
  const map = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'revoked': 'info'
  }
  return map[status] || 'info'
}

function formatDate(date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function loadData() {
  loading.value = true
  try {
    const res = await getMyMakeups({
      status: filterStatus.value || undefined,
      page: page.value,
      page_size: pageSize.value
    })
    makeupList.value = res.data || res.list || []
    total.value = res.total || 0
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadData()
}

async function viewDetail(row) {
  try {
    const res = await getMakeupDetail(row.id)
    currentDetail.value = res
    detailVisible.value = true
  } catch (err) {
    console.error(err)
  }
}

async function handleRevoke(row) {
  try {
    await ElMessageBox.confirm(
      `确定要撤销 ${row.makeup_date} 的补卡申请吗？`,
      '撤销确认',
      { type: 'warning' }
    )
    await revokeMakeup(row.id)
    ElMessage.success('撤销成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') console.error(err)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.my-makeup { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-bar {
  margin-bottom: 20px;
}

.time-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-item {
  font-size: 12px;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.time-item.in {
  background: #f0f9eb;
  color: #67c23a;
}

.time-item.out {
  background: #fdf6ec;
  color: #e6a23c;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 10px 0;
}

.approval-progress {
  margin: 24px 0 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.time-desc {
  font-size: 11px;
  color: #909399;
}

.timeline {
  padding: 0 10px;
  margin-top: 12px;
}
</style>
