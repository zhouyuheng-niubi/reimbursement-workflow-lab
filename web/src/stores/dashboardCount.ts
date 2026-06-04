import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

/**
 * 共享 dashboard/header 计数(未读通知、待审批数)。
 * 解决多组件重复请求问题:Dashboard.vue + BasicLayout.vue + NotificationBell.vue
 * 之前各自独立请求,登录后短时间内 /v1/notifications 被调 7 次。
 *
 * 策略:2 秒内的相同请求复用上次结果,超时才重新拉。
 */
const DEDUP_WINDOW_MS = 2_000

export const useDashboardCountStore = defineStore('dashboardCount', () => {
  const unreadNotificationCount = ref<number>(0)
  const pendingApprovalCount = ref<number>(0)

  let lastUnreadFetch = 0
  let lastPendingFetch = 0
  let unreadInflight: Promise<number> | null = null
  let pendingInflight: Promise<number> | null = null

  async function fetchUnreadCount(force = false): Promise<number> {
    const now = Date.now()
    if (!force && now - lastUnreadFetch < DEDUP_WINDOW_MS) {
      return unreadNotificationCount.value
    }
    if (unreadInflight) return unreadInflight

    unreadInflight = (async () => {
      try {
        const data = await request.get<{ unreadCount: number }>('/v1/notifications/unread-count')
        unreadNotificationCount.value = data?.unreadCount ?? 0
        lastUnreadFetch = Date.now()
        return unreadNotificationCount.value
      } finally {
        unreadInflight = null
      }
    })()
    return unreadInflight
  }

  async function fetchPendingCount(force = false): Promise<number> {
    const now = Date.now()
    if (!force && now - lastPendingFetch < DEDUP_WINDOW_MS) {
      return pendingApprovalCount.value
    }
    if (pendingInflight) return pendingInflight

    pendingInflight = (async () => {
      try {
        const data = await request.get<{ total: number }>('/v1/approvals/pending', {
          params: { pageSize: 1 },
        })
        pendingApprovalCount.value = data?.total ?? 0
        lastPendingFetch = Date.now()
        return pendingApprovalCount.value
      } finally {
        pendingInflight = null
      }
    })()
    return pendingInflight
  }

  function reset(): void {
    unreadNotificationCount.value = 0
    pendingApprovalCount.value = 0
    lastUnreadFetch = 0
    lastPendingFetch = 0
  }

  return {
    unreadNotificationCount,
    pendingApprovalCount,
    fetchUnreadCount,
    fetchPendingCount,
    reset,
  }
})
