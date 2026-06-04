import { request } from '@/utils/request'
import type { NotificationPage } from '@/types'

export function fetchNotifications(params?: Record<string, unknown>) {
  return request<NotificationPage>({
    url: '/v1/notifications',
    data: params,
  })
}

export function fetchUnreadCount() {
  return request<{ unreadCount: number }>({
    url: '/v1/notifications/unread-count',
  })
}

export function markNotificationRead(id: number | string) {
  return request<void>({
    url: `/v1/notifications/${id}/read`,
    method: 'PUT',
  })
}

export function markAllNotificationsRead() {
  return request<{ markedCount: number }>({
    url: '/v1/notifications/read-all',
    method: 'PUT',
  })
}
