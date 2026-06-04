<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">识别确认</view>
        <view class="page-hero__title">{{ result.sellerName || result.originalFileName || '识别结果' }}</view>
      </view>

      <SectionCard title="识别字段">
        <view class="info-list">
          <view class="info-row"><text>发票号码</text><text>{{ result.invoiceNo || '--' }}</text></view>
          <view class="info-row"><text>发票代码</text><text>{{ result.invoiceCode || '--' }}</text></view>
          <view class="info-row"><text>开票日期</text><text>{{ formatDate(result.invoiceDate) }}</text></view>
          <view class="info-row"><text>价税合计</text><text>¥{{ formatMoney(result.amountWithTax ?? result.totalAmount) }}</text></view>
          <view class="info-row"><text>税额</text><text>¥{{ formatMoney(result.taxAmount) }}</text></view>
          <view class="info-row"><text>验真状态</text><text>{{ result.verifyStatus === 1 ? '已验真' : '待验真' }}</text></view>
        </view>
      </SectionCard>

      <view class="button-row">
        <button class="ghost-btn" @click="handleVerify">补做验真</button>
        <button class="primary-btn" @click="goCreate">创建报销</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import { verifyInvoice } from '@/api/invoice'
import { formatDate, formatMoney } from '@/utils/format'
import type { InvoiceRecord } from '@/types'

const result = reactive<Partial<InvoiceRecord>>({})

function hydrate() {
  const raw = uni.getStorageSync('mobileLatestOcr')
  if (raw) {
    Object.assign(result, JSON.parse(raw) as InvoiceRecord)
  }
}

async function handleVerify() {
  if (!result.id) {
    return
  }
  try {
    const verified = await verifyInvoice(result.id)
    Object.assign(result, verified)
    uni.setStorageSync('mobileLatestOcr', JSON.stringify(verified))
    uni.setStorageSync('mobileSelectedInvoices', JSON.stringify([verified]))
    uni.showToast({ title: '验真完成', icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '验真失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/reimbursement/create?source=ocr' })
}

onLoad(() => {
  hydrate()
})
</script>

<style scoped lang="scss">
.info-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  font-size: 25rpx;
  color: #10233f;
}
</style>
