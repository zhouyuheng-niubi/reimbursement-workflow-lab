<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">拍票识别</view>
        <view class="page-hero__title">OCR</view>
      </view>

      <SectionCard :title="status.providerLabel || status.provider || 'OCR'">
        <view class="info-list">
          <view class="info-row">
            <text>主识别</text>
            <text>{{ status.primaryEngine || status.providerLabel || status.provider || '--' }}</text>
          </view>
          <view class="info-row">
            <text>兜底</text>
            <text>{{ status.fallbackProviderLabel || status.fallbackProvider || '--' }}</text>
          </view>
        </view>
        <button class="primary-btn" :disabled="uploading" @click="chooseImage">
          {{ uploading ? '识别中...' : '拍照 / 相册选择' }}
        </button>
      </SectionCard>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import { getOcrStatus, recognizeInvoice } from '@/api/invoice'
import { useSession } from '@/composables/useSession'
import type { InvoiceRecord, OcrStatus } from '@/types'

const session = useSession()
const uploading = ref(false)
const status = reactive<OcrStatus>({ enabled: false, provider: '' })

async function loadStatus() {
  if (!session.requireAuth()) {
    return
  }
  try {
    Object.assign(status, await getOcrStatus())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR 状态读取失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

function persistResult(result: InvoiceRecord) {
  uni.setStorageSync('mobileLatestOcr', JSON.stringify(result))
  uni.setStorageSync('mobileSelectedInvoices', JSON.stringify([result]))
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const filePath = res.tempFilePaths?.[0]
      if (!filePath) {
        return
      }
      uploading.value = true
      try {
        const result = await recognizeInvoice(filePath)
        persistResult(result)
        uni.navigateTo({ url: `/pages/invoice/confirm?id=${result.id || ''}` })
      } catch (error) {
        const message = error instanceof Error ? error.message : '识别失败'
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

onShow(() => {
  loadStatus()
})
</script>

<style scoped lang="scss">
.info-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-bottom: 18rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  font-size: 24rpx;
  color: #10233f;
}
</style>
