<template>
  <div class="departments">
    <div class="page-header">
      <h2 class="page-title">部门管理</h2>
      <el-button type="primary" :icon="Plus" @click="handleAdd">
        新增部门
      </el-button>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="部门名称" width="200" />
        <el-table-column prop="manager_name" label="部门负责人" width="150" />
        <el-table-column prop="employee_count" label="员工人数" width="120" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="500px"
      @close="resetForm"
    >
      <el-form :model="deptForm" :rules="rules" ref="deptFormRef" label-width="100px">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="deptForm.name" />
        </el-form-item>
        <el-form-item label="部门负责人" prop="manager_id">
          <el-select 
            v-model="deptForm.manager_id" 
            placeholder="请选择负责人" 
            clearable
            style="width: 100%"
            filterable
          >
            <el-option 
              v-for="emp in employees" 
              :key="emp.id" 
              :label="`${emp.name} (${emp.employee_no})`" 
              :value="emp.id" 
            />
          </el-select>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getDepartmentList, createDepartment, updateDepartment, deleteDepartment } from '@/api/department'
import { getEmployeeList } from '@/api/employee'
import dayjs from 'dayjs'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const deptFormRef = ref(null)
const editId = ref(null)

const tableData = ref([])
const employees = ref([])

const deptForm = reactive({
  name: '',
  manager_id: ''
})

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑部门' : '新增部门')

function formatDateTime(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

async function loadEmployees() {
  try {
    const res = await getEmployeeList({ page: 1, pageSize: 100 })
    employees.value = res.list
  } catch (error) {
    console.error('获取员工列表失败:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await getDepartmentList()
    tableData.value = res
  } catch (error) {
    console.error('获取部门列表失败:', error)
  } finally {
    loading.value = false
  }
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
  deptForm.name = row.name
  deptForm.manager_id = row.manager_id || ''
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除部门「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteDepartment(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

function resetForm() {
  deptForm.name = ''
  deptForm.manager_id = ''
  if (deptFormRef.value) {
    deptFormRef.value.resetFields()
  }
}

async function handleSubmit() {
  if (!deptFormRef.value) return
  
  try {
    await deptFormRef.value.validate()
    submitLoading.value = true
    
    const data = {
      name: deptForm.name,
      manager_id: deptForm.manager_id || null
    }
    
    if (isEdit.value) {
      await updateDepartment(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createDepartment(data)
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
  loadData()
  loadEmployees()
})
</script>

<style scoped>
.departments {
  padding: 0;
}
</style>
