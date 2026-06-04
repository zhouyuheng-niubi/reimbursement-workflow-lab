import { reactive, readonly } from 'vue'
import { login as loginApi, getUserInfo as getUserInfoApi } from '@/api/auth'
import type { LoginParams, UserInfo } from '@/types'

const storedUser = uni.getStorageSync('userInfo')

const state = reactive<{
  token: string
  userInfo: UserInfo | null
  loading: boolean
}>({
  token: uni.getStorageSync('token') || '',
  userInfo: storedUser ? (JSON.parse(storedUser) as UserInfo) : null,
  loading: false,
})

function persistSession(token: string, userInfo: UserInfo | null) {
  state.token = token
  state.userInfo = userInfo
  if (token) {
    uni.setStorageSync('token', token)
  } else {
    uni.removeStorageSync('token')
  }
  if (userInfo) {
    uni.setStorageSync('userInfo', JSON.stringify(userInfo))
  } else {
    uni.removeStorageSync('userInfo')
  }
}

export function primeSession() {
  const token = uni.getStorageSync('token') || ''
  const rawUser = uni.getStorageSync('userInfo')
  state.token = token
  state.userInfo = rawUser ? (JSON.parse(rawUser) as UserInfo) : null
}

export async function login(payload: LoginParams) {
  state.loading = true
  try {
    const result = await loginApi(payload)
    persistSession(result.accessToken, result.userInfo)
    return result
  } finally {
    state.loading = false
  }
}

export async function loadUserInfo(force = false) {
  const hasCompleteProfile =
    !!state.userInfo?.departmentId &&
    !!state.userInfo?.companyId &&
    !!state.userInfo?.realName

  if (state.userInfo && !force && hasCompleteProfile) {
    return state.userInfo
  }
  if (!state.token) {
    return null
  }
  state.loading = true
  try {
    const userInfo = await getUserInfoApi()
    persistSession(state.token, userInfo)
    return userInfo
  } finally {
    state.loading = false
  }
}

export function logout() {
  persistSession('', null)
  uni.reLaunch({ url: '/pages/auth/login' })
}

export function requireAuth() {
  if (!state.token) {
    uni.reLaunch({ url: '/pages/auth/login' })
    return false
  }
  return true
}

export function useSession() {
  return {
    state: readonly(state),
    login,
    logout,
    loadUserInfo,
    requireAuth,
  }
}
