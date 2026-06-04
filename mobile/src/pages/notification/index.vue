<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">消息中心</view>
        <view class="page-hero__title">未读 {{ unreadCount }} 条</view>
      </view>

      <SectionCard title="通知列表">
        <template #extra>
          <button class="ghost-btn ghost-btn--sm" @click="handleReadAll">全部已读</button>
        </template>
        <view v-if="notifications.length" class="list-stack">
          <view
            v-for="item in notifications"
            :key="item.id"
            class="notice-card"
            @click="handleRead(item.id)"
          >
            <view class="notice-card__top">
              <text class="notice-card__title">{{ item.title }}</text>
              <text class="notice-card__time">{{ formatDate(item.createdAt, true) }}</text>
            </view>
            <view class="notice-card__content">{{ item.content || '--' }}</view>
            <view class="notice-card__meta">
              <text>{{ item.typeLabel || '业务通知' }}</text>
              <text>{{ item.isRead === 1 ? '已读' : '未读' }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无消息</view>
      </SectionCard>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notification'
import { useSession } from '@/composables/useSession'
import { formatDate } from '@/utils/format'
import type { NotificationItem } from '@/types'

const session = useSession()
const notifications = ref<NotificationItem[]>([])
const unreadCount = ref(0)

async function loadNotifications() {
  if (!session.requireAuth()) {
    return
  }
  try {
    const data = await fetchNotifications({ page: 1, pageSize: 20 })
    notifications.value = data.list ?? []
    unreadCount.value = data.unreadCount ?? 0
  } catch (error) {
    const message = error instanceof Error ? error.message : '通知加载失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

async function handleRead(id: number | string) {
  await markNotificationRead(id)
  loadNotifications()
}

async function handleReadAll() {
  await markAllNotificationsRead()
  loadNotifications()
}

onShow(() => {
  loadNotifications()
})
</script>

<style scoped lang="scss">
.ghost-btn--sm {
  width: auto;
  min-height: 64rpx;
  padding: 0 22rpx;
  font-size: 24rpx;
}

.notice-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.notice-card__top,
.notice-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.notice-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #10233f;
}

.notice-card__time,
.notice-card__meta {
  font-size: 22rpx;
  color: #7b8ba5;
}

.notice-card__content {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #42546f;
}
</style>
