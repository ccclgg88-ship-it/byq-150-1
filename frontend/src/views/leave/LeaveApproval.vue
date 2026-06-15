<template>
  <div class="leave-approval">
    <div class="page-header">
      <h2 class="page-title">待我审批</h2>
      <el-badge :value="pendingCount" class="item" type="danger">
        <span style="font-size: 14px; color: #606266">条待审批</span>
      </el-badge>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="employee_no" label="工号" width="120" />
        <el-table-column prop="employee_name" label="姓名" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" />
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
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="current_level" label="当前阶段" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.current_level === 1" type="warning">部门审批</el-tag>
            <el-tag v-else-if="row.current_level === 2" type="info">HR备案</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="handleApprove(row)">通过</el-button>
            <el-button type="danger" link @click="handleReject(row)">驳回</el-button>
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
          <el-descriptions-item label="工号">{{ currentDetail.employee_no }}</el-descriptions-item>
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
        </el-descriptions>

        <div class="dialog-footer" style="margin-top: 20px; text-align: right">
          <el-button type="success" @click="handleApprove(currentDetail)" v-if="!isApproved">通过</el-button>
          <el-button type="danger" @click="handleReject(currentDetail)" v-if="!isApproved">驳回</el-button>
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPendingLeaves, approveLeave, rejectLeave, getPendingCount } from '@/api/leave'
import dayjs from 'dayjs'

const loading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
const detailVisible = ref(false)
const currentDetail = ref(null)

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

const isApproved = computed(() => {
  return currentDetail.value?.status !== 'pending'
})

function formatDateTime(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

async function loadPendingCount() {
  try {
    const res = await getPendingCount()
    pendingCount.value = res.count
  } catch (error) {
    console.error('获取待审批数量失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await getPendingLeaves({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    tableData.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error('获取待审批列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function handleApprove(row) {
  try {
    await ElMessageBox.confirm(`确定通过 ${row.employee_name} 的请假申请吗？`, '提示', {
      confirmButtonText: '确定通过',
      cancelButtonText: '取消',
      type: 'success'
    })
    
    await approveLeave(row.id)
    ElMessage.success('审批通过')
    loadData()
    loadPendingCount()
    detailVisible.value = false
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审批失败:', error)
    }
  }
}

async function handleReject(row) {
  try {
    await ElMessageBox.confirm(`确定驳回 ${row.employee_name} 的请假申请吗？`, '提示', {
      confirmButtonText: '确定驳回',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await rejectLeave(row.id)
    ElMessage.success('已驳回')
    loadData()
    loadPendingCount()
    detailVisible.value = false
  } catch (error) {
    if (error !== 'cancel') {
      console.error('驳回失败:', error)
    }
  }
}

function viewDetail(row) {
  currentDetail.value = row
  detailVisible.value = true
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

onMounted(() => {
  loadData()
  loadPendingCount()
})
</script>

<style scoped>
.leave-approval {
  padding: 0;
}

.item {
  margin-left: 10px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
