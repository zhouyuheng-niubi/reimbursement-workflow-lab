import { request } from '@/utils/request'
import type { LoginParams, LoginResult, UserInfo } from '@/types'

export function login(payload: LoginParams) {
  return request<LoginResult>({
    url: '/v1/auth/login',
    method: 'POST',
    data: payload,
  })
}

export function getUserInfo() {
  return request<UserInfo>({
    url: '/v1/auth/user-info',
  })
}
