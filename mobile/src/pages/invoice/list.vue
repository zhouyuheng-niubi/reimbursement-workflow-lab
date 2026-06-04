<template>
  <view class="mobile-page">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">发票夹</view>
        <view class="page-hero__title">{{ pickerMode ? '选择发票' : '我的发票夹' }}</view>
      </view>

      <view class="button-row">
        <button class="primary-btn" @click="navigate('/pages/invoice/ocr')">拍票识别</button>
        <button class="ghost-btn" @click="navigate('/pages/reimbursement/create')">新建报销</button>
      </view>

      <SectionCard title="发票列表">
        <view v-if="invoices.length" class="list-stack">
          <view
            v-for="item in invoices"
            :key="item.id"
            class="invoice-card"
            :class="{ 'invoice-card--selected': selectedIds.includes(String(item.id)) }"
            @click="handleCardClick(item)"
          >
            <view class="invoice-card__top">
              <text class="invoice-card__title">{{ item.sellerName || item.originalFileName || '未命名发票' }}</text>
              <text class="invoice-card__amount">¥{{ formatMoney(item.amountWithTax ?? item.totalAmount) }}</text>
            </view>
            <view class="invoice-card__meta">
              <text>{{ item.invoiceNo || '未识别票号' }}</text>
              <text>{{ formatDate(item.invoiceDate) }}</text>
            </view>
            <view class="invoice-card__meta">
              <text>{{ item.ocrProvider || 'OCR' }}</text>
              <text>{{ item.verifyStatus === 1 ? '已验真' : '待验真' }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无发票</view>
      </SectionCard>

      <button v-if="pickerMode" class="primary-btn" @click="confirmSelection">导入所选发票</button>
    </view>

    <MobileTabBar v-if="!pickerMode" current="reimbursement" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import MobileTabBar from '@/components/MobileTabBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import { getOcrStatus, queryInvoices } from '@/api/invoice'
import { useSession } from '@/composables/useSession'
import { formatDate, formatMoney } from '@/utils/format'
import type { InvoiceRecord, OcrStatus } from '@/types'

const session = useSession()
const invoices = ref<InvoiceRecord[]>([])
const total = ref(0)
const pickerMode = ref(false)
const selectedIds = ref<string[]>([])
const ocrStatus = reactive<OcrStatus>({ enabled: false, provider: '' })

function navigate(path: string) {
  uni.navigateTo({ url: path })
}

function persistSelectedInvoices(items: InvoiceRecord[]) {
  uni.setStorageSync('mobileSelectedInvoices', JSON.stringify(items))
}

async function loadInvoices() {
  if (!session.requireAuth()) {
    return
  }
  const [invoicePage, status] = await Promise.all([
    queryInvoices({ page: 1, pageSize: 20, mineOnly: true }),
    getOcrStatus(),
  ])
  invoices.value = invoicePage.list ?? []
  total.value = invoicePage.total ?? 0
  Object.assign(ocrStatus, status)
}

function handleCardClick(item: InvoiceRecord) {
  if (!pickerMode.value) {
    persistSelectedInvoices([item])
    uni.navigateTo({ url: '/pages/reimbursement/create?source=invoice-list' })
    return
  }
  const key = String(item.id)
  if (selectedIds.value.includes(key)) {
    selectedIds.value = selectedIds.value.filter((current) => current !== key)
  } else {
    selectedIds.value = [...selectedIds.value, key]
  }
}

function confirmSelection() {
  const selected = invoices.value.filter((item) => selectedIds.value.includes(String(item.id)))
  persistSelectedInvoices(selected)
  uni.navigateBack()
}

onLoad((options) => {
  pickerMode.value = options?.picker === '1'
})

onShow(() => {
  loadInvoices()
})
</script>

<style scoped lang="scss">
.invoice-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e3eaf5;
}

.invoice-card--selected {
  border-color: #326bff;
  box-shadow: 0 0 0 2rpx rgba(50, 107, 255, 0.14);
}

.invoice-card__top,
.invoice-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.invoice-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #10233f;
}

.invoice-card__amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #2e63e8;
}

.invoice-card__meta {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7a8aa2;
}
</style>
