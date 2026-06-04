<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">{{ record.reimbNo || '审批详情' }}</view>
        <view class="page-hero__title">{{ record.title || '待审批单据' }}</view>
      </view>

      <SectionCard title="报销概览">
        <view class="info-list">
          <view class="info-row"><text>申请人</text><text>{{ record.applicantName || '--' }}</text></view>
          <view class="info-row"><text>报销类型</text><text>{{ record.typeName || '--' }}</text></view>
          <view class="info-row"><text>总金额</text><text>¥{{ formatMoney(record.totalAmount) }}</text></view>
          <view class="info-row"><text>提交时间</text><text>{{ formatDate(record.submitAt, true) }}</text></view>
          <view class="info-row"><text>收款人</text><text>{{ record.payeeName || '--' }}</text></view>
        </view>
      </SectionCard>

      <SectionCard title="审批记录">
        <view v-if="record.approvalRecords?.length" class="timeline">
          <view v-for="(item, index) in record.approvalRecords" :key="item.id || index" class="timeline__item">
            <view class="timeline__dot" />
            <view class="timeline__body">
              <text class="timeline__title">{{ item.nodeName || '--' }} · {{ item.actionLabel || '处理中' }}</text>
              <text class="timeline__meta">{{ item.approverName || '--' }} · {{ formatDate(item.actionAt || item.createdAt, true) }}</text>
              <text v-if="item.opinion" class="timeline__meta">{{ item.opinion }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无记录</view>
      </SectionCard>

      <SectionCard title="审批意见">
        <textarea v-model="opinion" class="textarea-box" auto-height placeholder="审批意见" />
      </SectionCard>

      <view class="button-row">
        <button class="danger-btn" :disabled="submitting" @click="submitAction(2)">驳回</button>
        <button class="primary-btn" :disabled="submitting" @click="submitAction(1)">
          {{ submitting ? '提交中...' : '通过' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import { doApproval } from '@/api/approval'
import { fetchReimbursementDetail } from '@/api/reimbursement'
import { useSession } from '@/composables/useSession'
import { formatDate, formatMoney } from '@/utils/format'
import type { ReimbursementRecord } from '@/types'

const session = useSession()
const record = reactive<Partial<ReimbursementRecord>>({})
const reimbursementId = ref('')
const opinion = ref('')
const submitting = ref(false)

async function loadDetail() {
  if (!session.requireAuth() || !reimbursementId.value) {
    return
  }
  Object.assign(record, await fetchReimbursementDetail(reimbursementId.value))
}

async function submitAction(action: number) {
  if (!reimbursementId.value) {
    return
  }
  if (action === 2 && !opinion.value) {
    uni.showToast({ title: '请填写驳回原因', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await doApproval(reimbursementId.value, {
      action,
      opinion: opinion.value || (action === 1 ? '移动端审批通过' : ''),
    })
    uni.showToast({ title: action === 1 ? '已审批通过' : '已驳回', icon: 'success' })
    uni.redirectTo({ url: '/pages/approval/pending' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '审批失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
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

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
  font-size: 24rpx;
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
