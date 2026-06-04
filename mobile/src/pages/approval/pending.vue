<template>
  <view class="mobile-page">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">我要审批</view>
        <view class="page-hero__title">{{ total }} 条任务等待你处理</view>
        <view class="hero-metrics">
          <view class="hero-metric">
            <text class="hero-metric__label">待办总数</text>
            <text class="hero-metric__value">{{ total }}</text>
          </view>
          <view class="hero-metric">
            <text class="hero-metric__label">最长等待</text>
            <text class="hero-metric__value">{{ longestWaitingDays }} 天</text>
          </view>
        </view>
      </view>

      <SectionCard title="待办列表">
        <view v-if="tasks.length" class="list-stack">
          <view
            v-for="item in tasks"
            :key="item.reimbursementId"
            class="task-card"
            @click="openDetail(item.reimbursementId)"
          >
            <view class="task-card__top">
              <text class="task-card__title">{{ item.title || item.reimbNo }}</text>
              <text class="task-card__amount">¥{{ formatMoney(item.totalAmount) }}</text>
            </view>
            <view class="task-card__meta">
              <text>{{ item.currentNodeName || '--' }}</text>
              <text>{{ item.applicantName || '--' }}</text>
            </view>
            <view class="task-card__meta">
              <text>{{ item.typeName || '--' }}</text>
              <text>{{ item.waitingDays || 0 }} 天</text>
            </view>
            <view class="task-card__footer">
              <text class="task-card__cta">立即处理</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无任务</view>
      </SectionCard>
    </view>

    <MobileTabBar current="approval" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import MobileTabBar from '@/components/MobileTabBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import { fetchPendingApprovals } from '@/api/approval'
import { useSession } from '@/composables/useSession'
import { formatMoney } from '@/utils/format'
import type { ApprovalPendingItem } from '@/types'

const session = useSession()
const tasks = ref<ApprovalPendingItem[]>([])
const total = ref(0)

const longestWaitingDays = computed(() => {
  return tasks.value.reduce((max, item) => Math.max(max, Number(item.waitingDays || 0)), 0)
})

async function loadTasks() {
  if (!session.requireAuth()) {
    return
  }
  const data = await fetchPendingApprovals({ page: 1, pageSize: 20 })
  tasks.value = data.list ?? []
  total.value = data.total ?? 0
}

function openDetail(id: number | string) {
  uni.navigateTo({ url: `/pages/approval/detail?id=${id}` })
}

onShow(() => {
  loadTasks()
})
</script>

<style scoped lang="scss">
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 20rpx;
}

.hero-metric {
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.14);
}

.hero-metric__label {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.hero-metric__value {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

.task-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.task-card__top,
.task-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
}

.task-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #10233f;
}

.task-card__amount {
  font-size: 28rpx;
  color: #2e63e8;
  font-weight: 700;
}

.task-card__meta {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7a8aa2;
}

.task-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #e6edf7;
}

.task-card__cta {
  font-size: 22rpx;
  font-weight: 700;
  color: #2e63e8;
  white-space: nowrap;
  margin-left: auto;
}
</style>
