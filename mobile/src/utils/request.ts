import type { ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function parseResponse<T>(raw: unknown): T {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : (raw as ApiResponse<T>)
  if (payload.code === 0 || payload.code === 200) {
    return payload.data
  }
  throw new Error(payload.message || '请求失败')
}

function resolveUrl(url: string) {
  if (url.startsWith('http')) {
    return url
  }
  return `${API_BASE_URL}${url}`
}

function buildHeaders(extraHeaders?: Record<string, string>) {
  const token = uni.getStorageSync('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders ?? {}),
  }
}

export async function request<T = unknown>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  header?: Record<string, string>
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: resolveUrl(options.url),
      method: options.method ?? 'GET',
      data: options.data as string | Record<string, unknown> | ArrayBuffer | undefined,
      header: buildHeaders(options.header),
      success: (res) => {
        try {
          resolve(parseResponse<T>(res.data))
        } catch (error) {
          const err = error instanceof Error ? error : new Error('请求失败')
          if (res.statusCode === 401) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
          }
          reject(err)
        }
      },
      fail: (error) => reject(error),
    })
  })
}

export async function upload<T = unknown>(options: {
  url: string
  filePath: string
  name?: string
  formData?: Record<string, string | number | boolean>
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    uni.uploadFile({
      url: resolveUrl(options.url),
      filePath: options.filePath,
      name: options.name ?? 'file',
      formData: options.formData,
      header: buildHeaders(),
      success: (res) => {
        try {
          resolve(parseResponse<T>(res.data))
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => reject(error),
    })
  })
}
