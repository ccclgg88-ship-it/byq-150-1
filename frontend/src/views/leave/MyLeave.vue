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
  // 可以打开详情弹窗
  console.log('详情', row)
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
}

.leave-stat {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  color: #fff;
}

.leave-stat.annual {
  background: linear-gradient(135deg, #409EFF 0%, #3685d6 100%);
}

.leave-stat.approved {
  background: linear-gradient(135deg, #67C23A 0%, #5db335 100%);
}

.leave-stat.pending {
  background: linear-gradient(135deg, #E6A23C 0%, #d89532 100%);
}

.leave-stat.rejected {
  background: linear-gradient(135deg, #F56C6C 0%, #e65a5a 100%);
}

.stat-num {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
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
