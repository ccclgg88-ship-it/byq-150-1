<template>
  <div class="login-container">
    <div class="bg-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
    <div class="login-box">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon :size="36"><User /></el-icon>
        </div>
        <h2>员工花名册与考勤联动系统</h2>
        <p>HR Management System</p>
      </div>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" @keyup.enter="handleLogin">
        <el-form-item prop="employee_no">
          <el-input v-model="loginForm.employee_no" placeholder="请输入工号" size="large" :prefix-icon="User">
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" :prefix-icon="Lock" show-password>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
      <div class="login-tips">
        <div class="tips-header">测试账号</div>
        <div class="tips-accounts">
          <div class="tip-item"><span class="tip-role">HR管理员</span><span class="tip-account">HR001 / 123456</span></div>
          <div class="tip-item"><span class="tip-role">部门主管</span><span class="tip-account">TECH001 / 123456</span></div>
          <div class="tip-item"><span class="tip-role">普通员工</span><span class="tip-account">TECH002 / 123456</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  employee_no: '',
  password: ''
})

const rules = {
  employee_no: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    await userStore.login(loginForm.employee_no, loginForm.password)
    
    ElMessage.success('登录成功')
    
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  position: relative;
  overflow: hidden;
}

.bg-shapes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
}

.shape-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -200px;
  right: -150px;
  animation: float1 8s ease-in-out infinite;
}

.shape-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  bottom: -100px;
  left: -100px;
  animation: float2 10s ease-in-out infinite;
}

.shape-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float3 12s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-30px, 20px) scale(1.05); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -30px) scale(1.08); }
}

@keyframes float3 {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.login-box {
  width: 420px;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 1;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-icon {
  width: 68px;
  height: 68px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 8px 36px rgba(102, 126, 234, 0.6); }
}

.login-header h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.login-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.login-box :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-box :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: none;
  transition: all 0.3s ease;
}

.login-box :deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.14);
}

.login-box :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(102, 126, 234, 0.7);
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.login-box :deep(.el-input__inner) {
  color: #fff;
}

.login-box :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

.login-box :deep(.el-input__prefix .el-icon) {
  color: rgba(255, 255, 255, 0.5);
}

.login-box :deep(.el-input__suffix .el-icon) {
  color: rgba(255, 255, 255, 0.5);
}

.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.55);
}

.login-btn:active {
  transform: translateY(0);
}

.login-tips {
  margin-top: 28px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tips-header {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.tips-accounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.tip-role {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(102, 126, 234, 0.2);
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.tip-account {
  color: rgba(255, 255, 255, 0.45);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.5px;
}
</style>
