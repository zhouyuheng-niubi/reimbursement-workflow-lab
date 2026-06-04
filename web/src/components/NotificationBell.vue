<template>
  <a-popover
    v-model:open="popoverVisible"
    trigger="click"
    placement="bottomRight"
    :arrow="false"
    overlay-class-name="notif-bell-popover"
  >
    <!-- Trigger: Bell + unread badge -->
    <a-badge :count="unreadCount" :offset="[-2, 2]" :overflow-count="99">
      <BellOutlined class="bell-icon" :class="{ 'bell-icon--active': unreadCount > 0 }" />
    </a-badge>

    <!-- Popover Content -->
    <template #content>
      <div class="bell-panel">
        <!-- Header -->
        <div class="bell-panel__header">
          <span class="bell-panel__title">消息通知</span>
          <a-badge
            v-if="unreadCount > 0"
            :count="unreadCount"
            :number-style="{ backgroundColor: '#1677ff' }"
          />
        </div>

        <!-- Loading skeleton -->
        <a-spin :spinning="loading" size="small">
          <!-- Empty state -->
          <div v-if="!loading && recentList.length === 0" class="bell-panel__empty">
            <BellOutlined style="font-size: 32px; color: #d9d9d9" />
            <p>暂无未读消息</p>
          </div>

          <!-- Notification items -->
          <div
            v-for="item in recentList"
            :key="item.id"
            class="bell-item"
            :class="{ 'bell-item--unread': item.isRead === 0 }"
            @click="handleItemClick(item)"
          >
            <span
              class="bell-item__icon"
              :style="{ color: typeIconMap[item.notifyType]?.color || '#999' }"
            >
              <component :is="typeIconMap[item.notifyType]?.icon || BellOutlined" />
            </span>

            <div class="bell-item__body">
              <div class="bell-item__title" :class="{ 'bell-item__title--read': item.isRead === 1 }">
                {{ item.title }}
              </div>
              <div class="bell-item__time">{{ formatTime(item.createdAt) }}</div>
            </div>

            <a-badge v-if="item.isRead === 0" color="#1677ff" class="bell-item__dot" />
          </div>
        </a-spin>

        <!-- Footer -->
        <div class="bell-panel__footer">
          <router-link to="/notification/list" @click="popoverVisible = false">
            查看全部通知
            <RightOutlined />
          </router-link>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  NotificationOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import request from '@/utils/request'
import { useDashboardCountStore } from '@/stores/dashboardCount'
import { storeToRefs } from 'pinia'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationVO {
  id: number
  notifyType: number
  notifyTypeName: string
  title: string
  content: string
  bizType: string
  bizId: number
  isRead: number
  createdAt: string
}

interface NotificationPageVO {
  list: NotificationVO[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const typeIconMap: Record<number, { icon: unknown; color: string }> = {
  1: { icon: CheckCircleOutlined,  color: 'orange'  },
  2: { icon: CloseCircleOutlined,  color: 'red'     },
  3: { icon: CheckCircleOutlined,  color: '#52c41a' },
  4: { icon: DollarOutlined,       color: '#1677ff' },
  5: { icon: FieldTimeOutlined,    color: 'orange'  },
  6: { icon: NotificationOutlined, color: '#722ed1' },
}

// ─── State ────────────────────────────────────────────────────────────────────

const router         = useRouter()
const popoverVisible = ref(false)
const loading        = ref(false)
const recentList     = ref<NotificationVO[]>([])
const dashboardCount = useDashboardCountStore()
const { unreadNotificationCount: unreadCount } = storeToRefs(dashboardCount)

let pollTimer: ReturnType<typeof setInterval> | null = null

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchUnread() {
  // 角标数字走共享 store(2 秒去重),避免和其他组件并发请求
  await dashboardCount.fetchUnreadCount(true)
}

// When popover opens, also fetch fresh data (拉最近 5 条)
async function fetchForPanel() {
  loading.value = true
  try {
    const data = await request.get<NotificationPageVO>('/v1/notifications', {
      params: { page: 1, pageSize: 5, isRead: 0 },
    })
    recentList.value = data.list || []
    // popover 拉到的 unreadCount 是权威值,顺便更新 store
    if (typeof data.unreadCount === 'number') {
      dashboardCount.unreadNotificationCount = data.unreadCount
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleItemClick(item: NotificationVO) {
  popoverVisible.value = false

  // Mark as read
  if (item.isRead === 0) {
    request.put(`/v1/notifications/${item.id}/read`).then(() => {
      item.isRead = 1
      if (unreadCount.value > 0) unreadCount.value--
    }).catch(() => {})
  }

  // Navigate
  if (item.bizId) {
    if (item.bizType === 'reimbursement') {
      router.push(`/reimbursement/${item.bizId}`)
    } else if (item.bizType === 'approval') {
      router.push('/approval/pending')
    }
  }
}

// Watch popover open to load fresh data
function handlePopoverChange(visible: boolean) {
  if (visible) fetchForPanel()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(val: string): string {
  if (!val) return '—'
  const d = dayjs(val)
  const diffHours = dayjs().diff(d, 'hour')
  if (diffHours < 24) return d.fromNow()
  if (diffHours < 24 * 7) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD HH:mm')
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  // Initial load
  fetchUnread()
  // Poll every 30 seconds
  pollTimer = setInterval(fetchUnread, 30_000)
})

onUnmounted(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

// Watch popover open state
watch(popoverVisible, handlePopoverChange)
</script>

<style scoped lang="less">
.bell-icon {
  font-size: 18px;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: color 0.3s;

  &:hover,
  &--active {
    color: #1677ff;
  }
}

// Panel container
.bell-panel {
  width: 360px;
  padding: 0;
}

.bell-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.bell-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  flex: 1;
}

.bell-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: rgba(0, 0, 0, 0.35);

  p {
    margin-top: 8px;
    font-size: 13px;
  }
}

// Individual item
.bell-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f7f7f7;
  position: relative;

  &:last-of-type {
    border-bottom: none;
  }

  &:hover {
    background: #fafafa;
  }

  &--unread {
    background: #f0f8ff;

    &:hover {
      background: #e6f4ff;
    }
  }
}

.bell-item__icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.bell-item__body {
  flex: 1;
  min-width: 0;
}

.bell-item__title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;

  // Single line truncation
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--read {
    font-weight: 400;
    color: rgba(0, 0, 0, 0.45);
  }
}

.bell-item__time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  margin-top: 3px;
}

.bell-item__dot {
  flex-shrink: 0;
  margin-top: 4px;
}

// Footer "view all" link
.bell-panel__footer {
  text-align: center;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;

  a {
    font-size: 13px;
    color: #1677ff;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.75;
    }
  }
}
</style>

<!-- Global style: widen the popover panel and remove default padding -->
<style lang="less">
.notif-bell-popover {
  .ant-popover-inner {
    padding: 0;
    min-width: 360px;
    border-radius: 8px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08);
  }
}
</style>
