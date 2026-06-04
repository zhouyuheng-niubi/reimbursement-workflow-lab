import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'
import type { ApiResponse } from '@/types/api'

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach Bearer token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — unwrap data or handle errors
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const { data } = response
    if (data.code === 0 || data.code === 200) {
      return data.data as never
    }
    if (data.code === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    message.error(data.message || '请求失败')
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    if (error.response?.status === 403) {
      message.error('暂无权限访问')
    } else if (error.response?.status === 500) {
      message.error('服务器内部错误，请稍后重试')
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请检查网络连接')
    } else {
      message.error(error.response?.data?.message || '网络错误，请稍后重试')
    }
    return Promise.reject(error)
  },
)

const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>
  },
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>
  },
}

export default request
