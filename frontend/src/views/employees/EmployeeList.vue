<template>
  <div class="employee-list">
    <div class="page-header">
      <h2 class="page-title">员工花名册</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="handleAdd" v-if="userStore.isHR || userStore.isManager">
          新增员工
        </el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input 
            v-model="filterForm.keyword" 
            placeholder="工号/姓名" 
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select 
            v-model="filterForm.department_id" 
            placeholder="全部" 
            clearable
            style="width: 150px"
          >
            <el-option 
              v-for="dept in departments" 
              :key="dept.id" 
              :label="dept.name" 
              :value="dept.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select 
            v-model="filterForm.status" 
            placeholder="全部" 
            clearable
            style="width: 120px"
          >
            <el-option label="在职" value="active" />
            <el-option label="离职" value="resigned" />
            <el-option label="停薪留职" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="employee_no" label="工号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="department_name" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="120" />
        <el-table-column prop="hire_date" label="入职日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.hire_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            {{ roleMap[row.role] }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleEdit(row)" v-if="userStore.isHR || userStore.isManager">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)" v-if="userStore.isHR">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="500px"
      @close="resetForm"
    >
      <el-form :model="employeeForm" :rules="rules" ref="employeeFormRef" label-width="100px">
        <el-form-item label="工号" prop="employee_no">
          <el-input v-model="employeeForm.employee_no" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="employeeForm.name" />
        </el-form-item>
        <el-form-item label="部门" prop="department_id">
          <el-select v-model="employeeForm.department_id" placeholder="请选择" style="width: 100%">
            <el-option 
              v-for="dept in departments" 
              :key="dept.id" 
              :label="dept.name" 
              :value="dept.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位" prop="position">
          <el-input v-model="employeeForm.position" />
        </el-form-item>
        <el-form-item label="入职日期" prop="hire_date">
          <el-date-picker 
            v-model="employeeForm.hire_date" 
            type="date" 
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="isEdit">
          <el-select v-model="employeeForm.status" style="width: 100%">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="resigned" />
            <el-option label="停薪留职" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role" v-if="userStore.isHR">
          <el-select v-model="employeeForm.role" style="width: 100%">
            <el-option label="普通员工" value="employee" />
            <el-option label="部门主管" value="manager" />
            <el-option label="HR管理员" value="hr" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="employeeForm.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getEmployeeList, createEmployee, updateEmployee, deleteEmployee } from '@/api/employee'
import { getDepartmentList } from '@/api/department'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const employeeFormRef = ref(null)
const editId = ref(null)

const tableData = ref([])
const departments = ref([])

const filterForm = reactive({
  keyword: '',
  department_id: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const employeeForm = reactive({
  employee_no: '',
  name: '',
  department_id: '',
  position: '',
  hire_date: '',
  status: 'active',
  role: 'employee',
  password: '123456'
})

const rules = {
  employee_no: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  department_id: [{ required: true, message: '请选择部门', trigger: 'change' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑员工' : '新增员工')

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

async function loadDepartments() {
  try {
    const res = await getDepartmentList()
    departments.value = res
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filterForm.keyword,
      department_id: filterForm.department_id || undefined,
      status: filterForm.status || undefined
    }
    const res = await getEmployeeList(params)
    tableData.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error('获取员工列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.department_id = ''
  filterForm.status = ''
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

function handleAdd() {
  isEdit.value = false
  editId.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(employeeForm, {
    employee_no: row.employee_no,
    name: row.name,
    department_id: row.department_id,
    position: row.position,
    hire_date: row.hire_date,
    status: row.status,
    role: row.role,
    password: ''
  })
  dialogVisible.value = true
}

function handleView(row) {
  router.push(`/employees/${row.id}`)
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除员工「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteEmployee(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

function resetForm() {
  Object.assign(employeeForm, {
    employee_no: '',
    name: '',
    department_id: '',
    position: '',
    hire_date: '',
    status: 'active',
    role: 'employee',
    password: '123456'
  })
  if (employeeFormRef.value) {
    employeeFormRef.value.resetFields()
  }
}

async function handleSubmit() {
  if (!employeeFormRef.value) return
  
  try {
    await employeeFormRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateEmployee(editId.value, employeeForm)
      ElMessage.success('更新成功')
    } else {
      await createEmployee(employeeForm)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadDepartments()
  loadData()
})
</script>

<style scoped>
.employee-list {
  padding: 0;
}

.filter-card {
  margin-bottom: 0;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
