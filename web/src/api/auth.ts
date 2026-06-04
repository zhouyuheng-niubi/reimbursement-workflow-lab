import request from '@/utils/request'
import type { LoginParams, UserInfo } from '@/types/api'

export function login(params: LoginParams) {
  return request.post<{ accessToken: string; refreshToken: string; userInfo: UserInfo }>(
    '/v1/auth/login',
    params,
  )
}

export function logout() {
  return request.post('/v1/auth/logout')
}

export function getUserInfo() {
  return request.get<UserInfo>('/v1/auth/user-info')
}
