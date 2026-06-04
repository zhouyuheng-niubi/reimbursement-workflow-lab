<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">{{ record.reimbNo || '报销详情' }}</view>
        <view class="page-hero__title">{{ record.title || '未命名报销单' }}</view>
        <StatusPill :status="record.status" :label="record.statusLabel" />
      </view>

      <SectionCard title="基本信息">
        <view class="info-list">
          <view class="info-row"><text>报销类型</text><text>{{ record.typeName || '--' }}</text></view>
          <view class="info-row"><text>申请人</text><text>{{ record.applicantName || '--' }}</text></view>
          <view class="info-row"><text>总金额</text><text>¥{{ formatMoney(record.totalAmount) }}</text></view>
          <view class="info-row"><text>审批金额</text><text>¥{{ formatMoney(record.approvedAmount) }}</text></view>
          <view class="info-row"><text>收款人</text><text>{{ record.payeeName || '--' }}</text></view>
          <view class="info-row"><text>提交时间</text><text>{{ formatDate(record.submitAt, true) }}</text></view>
          <view v-if="record.rejectReason" class="info-row"><text>驳回原因</text><text>{{ record.rejectReason }}</text></view>
        </view>
      </SectionCard>

      <SectionCard title="费用明细">
        <view v-if="record.details?.length" class="list-stack">
          <view v-for="(item, index) in record.details" :key="item.id || index" class="detail-card">
            <view class="detail-card__top">
              <text>{{ item.description || '费用明细' }}</text>
              <text class="detail-card__amount">¥{{ formatMoney(item.amount) }}</text>
            </view>
            <view class="detail-card__meta">
              <text>{{ formatDate(item.expenseDate) }}</text>
              <text>{{ item.vendorName || item.invoiceNo || '--' }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无明细</view>
      </SectionCard>

      <SectionCard title="审批时间线">
        <view v-if="record.approvalRecords?.length" class="timeline">
          <view v-for="(item, index) in record.approvalRecords" :key="item.id || index" class="timeline__item">
            <view class="timeline__dot" />
            <view class="timeline__body">
              <text class="timeline__title">{{ item.nodeName || '审批节点' }} · {{ item.actionLabel || '处理中' }}</text>
              <text class="timeline__meta">{{ item.approverName || '--' }} · {{ formatDate(item.actionAt || item.createdAt, true) }}</text>
              <text v-if="item.opinion" class="timeline__meta">{{ item.opinion }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无记录</view>
      </SectionCard>

      <button
        v-if="record.status === 1 || record.status === 2"
        class="danger-btn"
        @click="handleWithdraw"
      >
        撤回审批
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import StatusPill from '@/components/StatusPill.vue'
import { fetchReimbursementDetail, withdrawReimbursement } from '@/api/reimbursement'
import { useSession } from '@/composables/useSession'
import { formatDate, formatMoney } from '@/utils/format'
import type { ReimbursementRecord } from '@/types'

const session = useSession()
const record = reactive<Partial<ReimbursementRecord>>({})
const reimbursementId = ref<string>('')

async function loadDetail() {
  if (!session.requireAuth() || !reimbursementId.value) {
    return
  }
  Object.assign(record, await fetchReimbursementDetail(reimbursementId.value))
}

async function handleWithdraw() {
  if (!reimbursementId.value) {
    return
  }
  await withdrawReimbursement(reimbursementId.value)
  uni.showToast({ title: '已撤回', icon: 'success' })
  loadDetail()
}

onLoad((options) => {
  reimbursementId.value = options?.id || ''
})

onShow(() => {
  loadDetail()
})
</script>

<style scoped lang="scss">
.info-list,
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row,
.detail-card__top,
.detail-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
  font-size: 24rpx;
}

.detail-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.detail-card__amount {
  color: #2e63e8;
  font-weight: 700;
}

.detail-card__meta {
  margin-top: 10rpx;
  color: #7a8aa2;
}

.timeline__item {
  display: flex;
  gap: 16rpx;
}

.timeline__dot {
  width: 18rpx;
  height: 18rpx;
  margin-top: 10rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #326bff 0%, #74a2ff 100%);
}

.timeline__title {
  font-size: 26rpx;
  font-weight: 700;
  color: #10233f;
}

.timeline__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7a8aa2;
}
</style>
