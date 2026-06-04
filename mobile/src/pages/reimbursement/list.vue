<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">报销</view>
        <view class="page-hero__title">我的报销</view>
      </view>

      <SectionCard title="快捷入口">
        <view class="action-grid">
          <view class="action-card" @click="openOcr">
            <text class="action-card__title">拍票识别</text>
          </view>
          <view class="action-card" @click="openInvoiceFolder">
            <text class="action-card__title">我的发票夹</text>
          </view>
          <view class="action-card" @click="openCreate">
            <text class="action-card__title">新建报销</text>
          </view>
        </view>
      </SectionCard>

      <SectionCard title="状态筛选">
        <scroll-view scroll-x class="status-scroll">
          <view class="status-chip-row">
            <view
              v-for="item in statusFilters"
              :key="item.value"
              class="status-chip"
              :class="{ 'status-chip--active': status === item.value }"
              @click="changeStatus(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>
      </SectionCard>

      <SectionCard title="报销列表">
        <view v-if="records.length" class="list-stack">
          <view
            v-for="item in records"
            :key="item.id"
            class="record-card"
            @click="openDetail(item.id)"
          >
            <view class="record-card__top">
              <text class="record-card__title">{{ item.title }}</text>
              <StatusPill :status="item.status" :label="item.statusLabel" />
            </view>
            <view class="record-card__meta">
              <text>{{ item.reimbNo || '未生成单号' }}</text>
              <text>{{ formatDate(item.submitAt || item.paymentAt || item.approveAt) }}</text>
            </view>
            <view class="record-card__bottom">
              <text>{{ item.typeName || '--' }}</text>
              <text class="record-card__amount">¥{{ formatMoney(item.totalAmount) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无记录</view>
      </SectionCard>
    </view>

    <MobileTabBar current="reimbursement" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import MobileTabBar from '@/components/MobileTabBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatusPill from '@/components/StatusPill.vue'
import { fetchReimbursements } from '@/api/reimbursement'
import { useSession } from '@/composables/useSession'
import { formatDate, formatMoney } from '@/utils/format'
import type { ReimbursementRecord } from '@/types'

const session = useSession()
const records = ref<ReimbursementRecord[]>([])
const total = ref(0)
const status = ref<number | undefined>(undefined)

const statusFilters = [
  { label: '全部', value: undefined },
  { label: '草稿', value: 0 },
  { label: '待审批', value: 1 },
  { label: '审批中', value: 2 },
  { label: '已通过', value: 3 },
  { label: '已付款', value: 6 },
]

async function loadRecords() {
  if (!session.requireAuth()) {
    return
  }
  const data = await fetchReimbursements({
    page: 1,
    pageSize: 20,
    status: status.value,
  })
  records.value = data.list ?? []
  total.value = data.total ?? 0
}

function changeStatus(next?: number) {
  status.value = next
  loadRecords()
}

function openDetail(id: number | string) {
  uni.navigateTo({ url: `/pages/reimbursement/detail?id=${id}` })
}

function openCreate() {
  uni.navigateTo({ url: '/pages/reimbursement/create' })
}

function openInvoiceFolder() {
  uni.navigateTo({ url: '/pages/invoice/list' })
}

function openOcr() {
  uni.navigateTo({ url: '/pages/invoice/ocr' })
}

onShow(() => {
  loadRecords()
})
</script>

<style scoped lang="scss">
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.action-card {
  padding: 18rpx;
  border-radius: 22rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.action-card__title {
  display: block;
  font-size: 25rpx;
  font-weight: 700;
  color: #10233f;
}

.status-scroll {
  white-space: nowrap;
}

.status-chip-row {
  display: flex;
  gap: 14rpx;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #eef3fb;
  color: #60738f;
  font-size: 24rpx;
}

.status-chip--active {
  background: #eaf2ff;
  color: #2e63e8;
}

.record-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e4ebf6;
}

.record-card__top,
.record-card__meta,
.record-card__bottom {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
}

.record-card__title {
  font-size: 28rpx;
  font-weight: 700;
}

.record-card__meta,
.record-card__bottom {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7a8aa2;
}

.record-card__amount {
  font-size: 28rpx;
  color: #2e63e8;
  font-weight: 700;
}
</style>
