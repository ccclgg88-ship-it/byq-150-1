import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getProfile } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  const isLogin = computed(() => !!token.value)
  const role = computed(() => userInfo.value?.role || '')
  const isHR = computed(() => userInfo.value?.role === 'hr')
  const isManager = computed(() => userInfo.value?.role === 'manager')
  const isEmployee = computed(() => userInfo.value?.role === 'employee')

  async function login(employeeNo, password) {
    const res = await loginApi(employeeNo, password)
    token.value = res.token
    userInfo.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('userInfo', JSON.stringify(res.user))
    return res
  }

  async function fetchProfile() {
    try {
      const res = await getProfile()
      userInfo.value = res
      localStorage.setItem('userInfo', JSON.stringify(res))
      return res
    } catch (error) {
      logout()
      throw error
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token,
    userInfo,
    isLogin,
    role,
    isHR,
    isManager,
    isEmployee,
    login,
    fetchProfile,
    logout
  }
})
