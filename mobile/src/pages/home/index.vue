<template>
  <view class="mobile-page">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">首页</view>
        <view class="page-hero__title">{{ session.state.userInfo?.realName || '您好' }}</view>
      </view>

      <SectionCard title="快捷入口">
        <view class="hero-actions">
          <view class="hero-actions__item" @click="navigate('/pages/invoice/ocr')">
            <text class="hero-actions__title">拍票识别</text>
          </view>
          <view class="hero-actions__item" @click="navigate('/pages/reimbursement/create')">
            <text class="hero-actions__title">新建报销</text>
          </view>
          <view class="hero-actions__item" @click="navigate('/pages/approval/pending')">
            <text class="hero-actions__title">处理审批</text>
          </view>
        </view>
      </SectionCard>

      <view class="metric-grid">
        <MetricCard label="我的报销" :value="String(myReimbursementsTotal)" />
        <MetricCard label="待我审批" :value="String(pendingApprovalTotal)" />
        <MetricCard label="未读消息" :value="String(unreadCount)" />
        <MetricCard label="OCR 引擎" :value="ocrStatus.providerLabel || ocrStatus.provider || '--'" :meta="ocrStatus.fallbackProviderLabel || ''" />
      </view>

      <SectionCard title="常用入口">
        <view class="quick-grid">
          <view v-for="item in actions" :key="item.label" class="quick-card" @click="navigate(item.path)">
            <view class="quick-card__title">{{ item.label }}</view>
          </view>
        </view>
      </SectionCard>

      <SectionCard title="待我审批">
        <view v-if="pendingApprovals.length" class="list-stack">
          <view
            v-for="item in pendingApprovals"
            :key="item.reimbursementId"
            class="task-card"
            @click="navigate(`/pages/approval/detail?id=${item.reimbursementId}`)"
          >
            <view class="task-card__top">
              <text class="task-card__title">{{ item.title || item.reimbNo }}</text>
              <text class="task-card__amount">¥{{ formatMoney(item.totalAmount) }}</text>
            </view>
            <view class="task-card__meta">
              <text>{{ item.currentNodeName || '待处理节点' }}</text>
              <text>{{ item.applicantName || '--' }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无任务</view>
      </SectionCard>

      <SectionCard title="最近报销">
        <view v-if="recentReimbursements.length" class="list-stack">
          <view
            v-for="item in recentReimbursements"
            :key="item.id"
            class="record-card"
            @click="navigate(`/pages/reimbursement/detail?id=${item.id}`)"
          >
            <view class="record-card__row">
              <text class="record-card__title">{{ item.title }}</text>
              <StatusPill :status="item.status" :label="item.statusLabel" />
            </view>
            <view class="record-card__row">
              <text class="muted-text">{{ item.reimbNo || '草稿单据' }}</text>
              <text class="record-card__amount">¥{{ formatMoney(item.totalAmount) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无记录</view>
      </SectionCard>
    </view>

    <MobileTabBar current="home" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import MetricCard from '@/components/MetricCard.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatusPill from '@/components/StatusPill.vue'
import { fetchPendingApprovals } from '@/api/approval'
import { getOcrStatus } from '@/api/invoice'
import { fetchNotifications } from '@/api/notification'
import { fetchReimbursements } from '@/api/reimbursement'
import { useSession } from '@/composables/useSession'
import { formatMoney } from '@/utils/format'
import type { ApprovalPendingItem, OcrStatus, ReimbursementRecord } from '@/types'

const session = useSession()
const myReimbursementsTotal = ref(0)
const pendingApprovalTotal = ref(0)
const unreadCount = ref(0)
const recentReimbursements = ref<ReimbursementRecord[]>([])
const pendingApprovals = ref<ApprovalPendingItem[]>([])
const ocrStatus = reactive<OcrStatus>({
  enabled: false,
  provider: '',
})

const actions = [
  { label: '拍票识别', path: '/pages/invoice/ocr' },
  { label: '新建报销', path: '/pages/reimbursement/create' },
  { label: '我的报销', path: '/pages/reimbursement/list' },
  { label: '我的发票夹', path: '/pages/invoice/list' },
]

function navigate(path: string) {
  uni.navigateTo({ url: path })
}

async function loadHome() {
  if (!session.requireAuth()) {
    return
  }
  try {
    await session.loadUserInfo()
    const [reimbursements, pending, notifications, status] = await Promise.all([
      fetchReimbursements({ page: 1, pageSize: 3 }),
      fetchPendingApprovals({ page: 1, pageSize: 3 }),
      fetchNotifications({ page: 1, pageSize: 3, isRead: 0 }),
      getOcrStatus(),
    ])
    myReimbursementsTotal.value = reimbursements.total ?? 0
    recentReimbursements.value = reimbursements.list ?? []
    pendingApprovalTotal.value = pending.total ?? 0
    pendingApprovals.value = pending.list ?? []
    unreadCount.value = notifications.unreadCount ?? 0
    Object.assign(ocrStatus, status)
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载首页失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

onShow(() => {
  loadHome()
})
</script>

<style scoped lang="scss">
.hero-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.hero-actions__item {
  padding: 18rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 100%);
  border: 1rpx solid #dfebfa;
}

.hero-actions__title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #10233f;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.quick-card,
.task-card,
.record-card {
  padding: 22rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.quick-card__title,
.task-card__title,
.record-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #10233f;
}

.task-card__meta,
.muted-text {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #7687a0;
}

.task-card__top,
.record-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.task-card__amount,
.record-card__amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #2f63e6;
}
</style>
