<template>
  <div class="notification-list page-container">
    <!-- Page Header -->
    <div class="page-header animate-fade-in-up">
      <div>
        <h2 class="page-title">
          <span class="page-title__icon">
            <BellOutlined />
            <span v-if="unreadCount > 0" class="page-title__badge">{{ unreadCount }}</span>
          </span>
          消息通知
        </h2>
      </div>
      <div class="page-header__actions">
        <a-button
          type="primary"
          :loading="markAllLoading"
          :disabled="unreadCount === 0"
          class="btn-mark-all"
          @click="handleMarkAll"
        >
          <CheckOutlined />
          全部标记已读
        </a-button>
      </div>
    </div>

    <!-- Main Card -->
    <a-card class="main-card animate-fade-in-up" style="animation-delay: 0.06s">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <a-tabs v-model:activeKey="activeTab" class="notif-tabs" @change="handleTabChange">
          <a-tab-pane key="" tab="全部" />
          <a-tab-pane key="0">
            <template #tab>
              <span class="tab-with-badge">
                未读
                <span v-if="unreadCount > 0" class="tab-count-badge">{{ unreadCount }}</span>
              </span>
            </template>
          </a-tab-pane>
          <a-tab-pane key="1" tab="已读" />
        </a-tabs>
      </div>

      <!-- List -->
      <a-spin :spinning="loading" class="spin-wrap">
        <!-- Empty state -->
        <div v-if="!loading && notifications.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <BellOutlined class="empty-icon" />
          </div>
          <p class="empty-title">暂无通知消息</p>
        </div>

        <!-- Grouped notification list -->
        <template v-else>
          <div
            v-for="(group, gIdx) in groupedNotifications"
            :key="group.label"
            class="notif-group animate-fade-in-up"
            :style="{ animationDelay: `${0.06 + gIdx * 0.05}s` }"
          >
            <!-- Group header -->
            <div class="group-header">
              <span class="group-dot" />
              <span class="group-label">{{ group.label }}</span>
              <div class="group-divider" />
              <span class="group-count">{{ group.items.length }} 条</span>
            </div>

            <!-- Items -->
            <div class="notif-items">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="notif-item"
                :class="{ 'notif-item--unread': item.isRead === 0 }"
                @click="handleItemClick(item)"
              >
                <!-- Unread bar -->
                <transition name="unread-bar">
                  <div v-if="item.isRead === 0" class="unread-bar" />
                </transition>

                <!-- Icon -->
                <div
                  class="notif-avatar"
                  :style="{
                    background: typeIconMap[item.notifyType]?.bgColor || 'rgba(100,116,139,0.1)',
                    color: typeIconMap[item.notifyType]?.color || '#64748b',
                  }"
                >
                  <component :is="typeIconMap[item.notifyType]?.icon || BellOutlined" />
                </div>

                <!-- Content -->
                <div class="notif-content">
                  <div class="notif-header-row">
                    <span class="notif-title" :class="{ 'notif-title--read': item.isRead === 1 }">
                      {{ item.title }}
                    </span>
                    <span
                      class="notif-type-tag"
                      :style="{
                        background: typeIconMap[item.notifyType]?.bgColor || 'rgba(100,116,139,0.08)',
                        color: typeIconMap[item.notifyType]?.color || '#64748b',
                      }"
                    >
                      {{ item.notifyTypeName }}
                    </span>
                  </div>

                  <p class="notif-body" :class="{ 'notif-body--read': item.isRead === 1 }">
                    {{ item.content }}
                  </p>

                  <div class="notif-footer">
                    <span class="notif-time">
                      <ClockCircleOutlined style="margin-right: 3px" />
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <div class="notif-actions">
                      <button
                        v-if="item.isRead === 0"
                        class="notif-btn notif-btn--read"
                        @click.stop="handleMarkRead(item)"
                      >
                        <CheckOutlined />
                        标记已读
                      </button>
                      <button
                        v-if="item.bizId"
                        class="notif-btn notif-btn--view"
                        @click.stop="handleItemClick(item)"
                      >
                        <ArrowRightOutlined />
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </a-spin>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="pagination-bar">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :show-quick-jumper="true"
          :page-size-options="['10', '20', '50']"
          :show-total="(total: number) => `共 ${total} 条`"
          @change="handlePageChange"
          @show-size-change="handlePageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  NotificationOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import request from '@/utils/request'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Icon / Color Map ────────────────────────────────────────────────────────

const typeIconMap: Record<number, { icon: unknown; color: string; bgColor: string; tagColor: string }> = {
  1: { icon: CheckCircleOutlined, color: '#d97706', bgColor: 'rgba(245,158,11,0.1)',  tagColor: 'orange'  }, // 审批提醒
  2: { icon: CloseCircleOutlined, color: '#dc2626', bgColor: 'rgba(239,68,68,0.1)',   tagColor: 'red'     }, // 驳回通知
  3: { icon: CheckCircleOutlined, color: '#16a34a', bgColor: 'rgba(34,197,94,0.1)',   tagColor: 'green'   }, // 通过通知
  4: { icon: DollarOutlined,      color: '#2563eb', bgColor: 'rgba(59,130,246,0.1)',  tagColor: 'blue'    }, // 付款通知
  5: { icon: FieldTimeOutlined,   color: '#d97706', bgColor: 'rgba(245,158,11,0.1)',  tagColor: 'orange'  }, // 催办
  6: { icon: NotificationOutlined,color: '#7c3aed', bgColor: 'rgba(139,92,246,0.1)', tagColor: 'purple'  }, // 系统公告
}

// ─── State ───────────────────────────────────────────────────────────────────

const router = useRouter()

const loading        = ref(false)
const markAllLoading = ref(false)
const notifications  = ref<NotificationVO[]>([])
const unreadCount    = ref(0)
const activeTab      = ref<string>('')   // '' = all | '0' = unread | '1' = read

const pagination = reactive({
  current:  1,
  pageSize: 10,
  total:    0,
})

// ─── Grouping ────────────────────────────────────────────────────────────────

interface Group { label: string; items: NotificationVO[] }

const groupedNotifications = computed<Group[]>(() => {
  const today     = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')

  const groups: Record<string, NotificationVO[]> = {}
  for (const item of notifications.value) {
    const d = dayjs(item.createdAt)
    let label: string
    if (d.isSame(today, 'day')) {
      label = '今天'
    } else if (d.isSame(yesterday, 'day')) {
      label = '昨天'
    } else {
      label = '更早'
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  }

  // Preserve order: 今天 → 昨天 → 更早
  const order = ['今天', '昨天', '更早']
  return order
    .filter(k => groups[k])
    .map(k => ({ label: k, items: groups[k] }))
})

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page:     pagination.current,
      pageSize: pagination.pageSize,
    }
    if (activeTab.value !== '') {
      params.isRead = Number(activeTab.value)
    }

    const data = await request.get<NotificationPageVO>('/v1/notifications', { params })
    notifications.value = data.list || []
    pagination.total    = data.total || 0
    unreadCount.value   = data.unreadCount ?? 0
  } catch {
    // error already handled by request interceptor
  } finally {
    loading.value = false
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleTabChange() {
  pagination.current = 1
  fetchList()
}

function handlePageChange(page: number, pageSize: number) {
  pagination.current  = page
  pagination.pageSize = pageSize
  fetchList()
}

async function handleMarkRead(item: NotificationVO) {
  if (item.isRead === 1) return
  try {
    await request.put(`/v1/notifications/${item.id}/read`)
    item.isRead = 1
    if (unreadCount.value > 0) unreadCount.value--
    message.success('已标记为已读')
  } catch {
    // handled by interceptor
  }
}

async function handleMarkAll() {
  markAllLoading.value = true
  try {
    const res = await request.put<{ markedCount: number }>('/v1/notifications/read-all')
    message.success(`已将 ${res?.markedCount ?? 0} 条消息标记为已读`)
    unreadCount.value = 0
    fetchList()
  } catch {
    // handled by interceptor
  } finally {
    markAllLoading.value = false
  }
}

function handleItemClick(item: NotificationVO) {
  // Mark as read silently
  if (item.isRead === 0) {
    request.put(`/v1/notifications/${item.id}/read`).then(() => {
      item.isRead = 1
      if (unreadCount.value > 0) unreadCount.value--
    }).catch(() => {})
  }

  // Navigate to associated business record
  if (item.bizId) {
    if (item.bizType === 'reimbursement') {
      router.push(`/reimbursement/${item.bizId}`)
    } else if (item.bizType === 'approval') {
      router.push(`/approval/pending`)
    }
  }
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
  fetchList()
})
</script>

<style scoped lang="less">
// ── 页面 ──────────────────────────────────────────────────────────────────────
.notification-list {
  max-width: 860px;
  margin: 0 auto;
}

// ── 标题图标 ──────────────────────────────────────────────────────────────────
.page-title__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--primary-gradient);
  color: #fff;
  font-size: 17px;
  margin-right: 10px;
  vertical-align: middle;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.3);
}

.page-title__badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: var(--r-full);
  background: var(--error);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-style: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px var(--bg-container);
  animation: badgePop 0.4s var(--ease-spring) both;
}

@keyframes badgePop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.btn-mark-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

// ── 主卡片 ────────────────────────────────────────────────────────────────────
.main-card {
  :deep(.ant-card-body) {
    padding: 0 !important;
  }
}

// ── Tab 栏 ────────────────────────────────────────────────────────────────────
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-light);

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;

    &::before {
      border-bottom: none;
    }
  }
}

.notif-tabs {
  flex: 1;
}

.tab-with-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--r-full);
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.unread-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
  padding: 0 0 0 16px;
  flex-shrink: 0;

  strong {
    color: var(--primary);
    font-weight: 700;
  }
}

.unread-dot-anim {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
  animation: dotPulse 2.2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(79,110,247,0.4); }
  50%       { opacity: 0.8; transform: scale(1.2); box-shadow: 0 0 0 5px rgba(79,110,247,0); }
}

// ── Spin 包裹 ─────────────────────────────────────────────────────────────────
.spin-wrap {
  min-height: 200px;
  padding: 0 0 8px;
}

// ── 空状态 ────────────────────────────────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72px 24px;
  text-align: center;
}

.empty-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px dashed rgba(79, 110, 247, 0.2);
    animation: rotateDash 12s linear infinite;
  }
}

@keyframes rotateDash {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 36px;
  color: var(--primary);
  opacity: 0.7;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

// ── 分组 ──────────────────────────────────────────────────────────────────────
.notif-group {
  padding: 0 0 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px 10px;
}

.group-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-gradient);
  flex-shrink: 0;
}

.group-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.group-divider {
  flex: 1;
  height: 1px;
  background: var(--border-light);
}

.group-count {
  font-size: 11px;
  color: var(--text-quaternary);
  white-space: nowrap;
}

// ── 通知项容器 ────────────────────────────────────────────────────────────────
.notif-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 16px;
}

// ── 通知项 ────────────────────────────────────────────────────────────────────
.notif-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px 14px 20px;
  border-radius: var(--r-lg);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  background: transparent;
  overflow: hidden;

  &:hover {
    background: var(--bg-hover);
    transform: translateX(2px);
  }

  &--unread {
    background: rgba(79, 110, 247, 0.03);

    &:hover {
      background: var(--primary-bg);
    }
  }
}

// ── 未读左侧高亮条 ────────────────────────────────────────────────────────────
.unread-bar {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--primary-gradient);
  box-shadow: 0 0 8px rgba(79, 110, 247, 0.4);
}

// 未读条进入/离开动画
.unread-bar-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}
.unread-bar-leave-active {
  transition: opacity var(--duration-slow) var(--ease-out),
              transform var(--duration-slow) var(--ease-out);
}
.unread-bar-enter-from {
  opacity: 0;
  transform: scaleY(0);
}
.unread-bar-leave-to {
  opacity: 0;
  transform: scaleX(0);
}

// ── 通知头像 ──────────────────────────────────────────────────────────────────
.notif-avatar {
  width: 42px;
  height: 42px;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-spring);

  .notif-item:hover & {
    transform: scale(1.08);
  }
}

// ── 通知内容区 ────────────────────────────────────────────────────────────────
.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.notif-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color var(--duration-fast) var(--ease-out);

  &--read {
    font-weight: 400;
    color: var(--text-tertiary);
  }
}

.notif-type-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.notif-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--duration-fast) var(--ease-out);

  &--read {
    color: var(--text-quaternary);
  }
}

.notif-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.notif-time {
  font-size: 12px;
  color: var(--text-quaternary);
  display: flex;
  align-items: center;
}

// ── 行内动作按钮 ──────────────────────────────────────────────────────────────
.notif-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);

  .notif-item:hover & {
    opacity: 1;
  }
}

.notif-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-out);

  &--read {
    background: var(--primary-bg);
    color: var(--primary);
    border-color: rgba(79, 110, 247, 0.2);

    &:hover {
      background: var(--primary-bg-hover);
      border-color: var(--primary);
      box-shadow: 0 2px 8px rgba(79, 110, 247, 0.15);
    }
  }

  &--view {
    background: var(--bg-page);
    color: var(--text-secondary);
    border-color: var(--border);

    &:hover {
      color: var(--primary);
      border-color: var(--primary);
      background: var(--primary-bg);
    }
  }
}

// ── 分页 ──────────────────────────────────────────────────────────────────────
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);

  :deep(.ant-pagination) {
    margin-top: 0 !important;
  }
}
</style>
