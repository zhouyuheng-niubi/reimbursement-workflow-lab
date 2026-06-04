import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'
import type { LoginParams, UserInfo } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') ?? '')
  const userInfo = ref<UserInfo | null>(null)

  async function login(params: LoginParams): Promise<void> {
    const res = await request.post<{ accessToken: string; refreshToken: string; userInfo: UserInfo }>('/v1/auth/login', params)
    token.value = res.accessToken
    userInfo.value = res.userInfo
    localStorage.setItem('token', res.accessToken)
    if (res.refreshToken) {
      localStorage.setItem('refreshToken', res.refreshToken)
    }
  }

  async function logout(): Promise<void> {
    try {
      await request.post('/v1/auth/logout')
    } catch (e) {
      // 忽略错误，即使后端调用失败也要清除本地状态
    }
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    // 清空跨组件共享的计数(避免下个用户登录看到上一个用户的角标)
    try {
      const { useDashboardCountStore } = await import('@/stores/dashboardCount')
      useDashboardCountStore().reset()
    } catch { /* ignore */ }
  }

  async function getUserInfo(): Promise<void> {
    if (!token.value) return
    const res = await request.get<UserInfo>('/v1/auth/user-info')
    userInfo.value = res
  }

  // ── 角色检查 ──
  function hasRole(role: string): boolean {
    return userInfo.value?.roles?.includes(role) ?? false
  }

  function hasAnyRole(roles: string[]): boolean {
    if (!userInfo.value?.roles) return false
    return roles.some(r => userInfo.value!.roles.includes(r))
  }

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => hasAnyRole(['ADMIN', 'SUPER_ADMIN']))
  const isFinance = computed(() => hasAnyRole(['FINANCE']))
  const isApprover = computed(() => hasAnyRole(['APPROVER', 'DEPT_MANAGER']))

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    isFinance,
    isApprover,
    hasRole,
    hasAnyRole,
    login,
    logout,
    getUserInfo,
  }
})
