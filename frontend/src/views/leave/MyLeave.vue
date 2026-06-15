<template>
  <div class="my-leave">
    <div class="page-header">
      <h2 class="page-title">我的请假</h2>
      <el-button type="primary" :icon="Plus" @click="goToApply">申请请假</el-button>
    </div>

    <el-card class="stats-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="leave-stat annual">
            <div class="stat-num">{{ annualLeave }}</div>
            <div class="stat-label">年假余额</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="leave-stat approved">
            <div class="stat-num">{{ leaveStats.approved || 0 }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="leave-stat pending">
            <div class="stat-num">{{ leaveStats.pending || 0 }}</div>
            <div class="stat-label">审批中</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="leave-stat rejected">
            <div class="stat-num">{{ leaveStats.rejected || 0 }}</div>
            <div class="stat-label">已驳回</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="审批中" name="pending" />
        <el-tab-pane label="已通过" name="approved" />
        <el-tab-pane label="已驳回" name="rejected" />
      </el-tabs>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="leave_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="leaveTypeColor[row.leave_type]">{{ leaveTypeMap[row.leave_type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="请假时间" width="250">
          <template #default="{ row }">
            {{ row.start_date }} 至 {{ row.end_date }}
            <div style="font-size: 12px; color: #909399; margin-top: 4px">共 {{ row.days }} 天</div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="事由" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="current_level" label="审批进度" width="120">
          <template #default="{ row }">
            <div v-if="row.status === 'pending'" class="progress-text">
              <span :class="{ active: row.current_level >= 1 }">部门审批</span>
              <span class="arrow">→</span>
              <span :class="{ active: row.current_level >= 2 }">HR备案</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="请假详情" width="500px">
      <template v-if="currentDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ currentDetail.employee_name }}</el-descriptions-item>
          <el-descriptions-item label="工号">{{ currentDetail.employee_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentDetail.department_name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="leaveTypeColor[currentDetail.leave_type]">
              {{ leaveTypeMap[currentDetail.leave_type] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ currentDetail.start_date }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ currentDetail.end_date }}</el-descriptions-item>
          <el-descriptions-item label="请假天数" :span="2">
            {{ currentDetail.days }} 天
          </el-descriptions-item>
          <el-descriptions-item label="事由" :span="2">
            {{ currentDetail.reason }}
          </el-descriptions-item>
          <el-descriptions-item label="申请状态" :span="2">
            <el-tag :type="statusTypeMap[currentDetail.status]">{{ statusMap[currentDetail.status] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审批进度" v-if="currentDetail.status === 'pending'" :span="2">
            <div class="progress-text">
              <span :class="{ active: currentDetail.current_level >= 1 }">部门审批</span>
              <span class="arrow">→</span>
              <span :class="{ active: currentDetail.current_level >= 2 }">HR备案</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="部门审批时间" v-if="currentDetail.manager_approved_at">
            {{ formatDateTime(currentDetail.manager_approved_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="HR审批时间" v-if="currentDetail.hr_approved_at">
            {{ formatDateTime(currentDetail.hr_approved_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="驳回人" v-if="currentDetail.rejected_by">
            {{ currentDetail.rejected_by }}
          </el-descriptions-item>
          <el-descriptions-item label="驳回时间" v-if="currentDetail.rejected_at">
            {{ formatDateTime(currentDetail.rejected_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="驳回原因" v-if="currentDetail.reject_reason" :span="2">
            {{ currentDetail.reject_reason }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="dialog-footer" style="margin-top: 20px; text-align: right">
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { getMyLeaves } from '@/api/leave'
import { getProfile } from '@/api/auth'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const activeTab = ref('all')
const tableData = ref([])
const annualLeave = ref(0)
const detailVisible = ref(false)
const currentDetail = ref(null)
const leaveStats = reactive({
  approved: 0,
  pending: 0,
  rejected: 0
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const leaveTypeMap = {
  annual: '年假',
  personal: '事假',
  sick: '病假'
}

const leaveTypeColor = {
  annual: '',
  personal: 'warning',
  sick: 'danger'
}

const statusMap = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已驳回'
}

const statusTypeMap = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger'
}

function formatDateTime(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

async function loadProfile() {
  try {
    const res = await getProfile()
    annualLeave.value = res.annual_leave_balance || 0
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    
    const res = await getMyLeaves(params)
    tableData.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error('获取请假记录失败:', error)
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  pagination.page = 1
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function goToApply() {
  router.push('/leave/apply')
}

function viewDetail(row) {
  currentDetail.value = row
  detailVisible.value = true
}

onMounted(() => {
  loadProfile()
  loadData()
})
</script>

<style scoped>
.my-leave {
  padding: 0;
}

.stats-card {
  margin-bottom: 0;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.leave-stat {
  text-align: center;
  padding: 22px 16px;
  border-radius: 12px;
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.leave-stat:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.leave-stat.annual {
  background: linear-gradient(135deg, #409EFF 0%, #36d1dc 100%);
}

.leave-stat.approved {
  background: linear-gradient(135deg, #67C23A 0%, #85d45a 100%);
}

.leave-stat.pending {
  background: linear-gradient(135deg, #E6A23C 0%, #f0be6a 100%);
}

.leave-stat.rejected {
  background: linear-gradient(135deg, #F56C6C 0%, #f89898 100%);
}

.stat-num {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
  letter-spacing: 1px;
}

.my-leave :deep(.el-card) {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
}

.my-leave :deep(.el-card):hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
}

.my-leave :deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

.my-leave :deep(.el-table th.el-table__cell) {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  font-weight: 600;
  color: #303133;
}

.my-leave :deep(.el-table tr:hover > td) {
  background: #f5f9ff !important;
}

.progress-text {
  font-size: 12px;
  color: #c0c4cc;
}

.progress-text .active {
  color: #409EFF;
  font-weight: 500;
}

.progress-text .arrow {
  margin: 0 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
