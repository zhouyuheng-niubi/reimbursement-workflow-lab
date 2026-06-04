<template>
  <div class="ocr-result-card">
    <div class="ocr-result-card__header">
      <div>
        <div class="ocr-result-card__title">OCR 识别结果</div>
        <div class="ocr-result-card__meta">
          主识别：{{ providerLabel || provider || '未识别' }}
          <template v-if="fallbackLabel || fallbackProvider">
            · 兜底：{{ fallbackLabel || fallbackProvider }}
          </template>
        </div>
      </div>
      <div class="ocr-result-card__confidence" v-if="confidence !== undefined && confidence !== null">
        {{ Number(confidence).toFixed(0) }}%
      </div>
    </div>

    <div class="ocr-result-card__grid">
      <div class="ocr-result-card__field">
        <span class="ocr-result-card__label">票据类型</span>
        <span class="ocr-result-card__value">{{ invoiceType || '—' }}</span>
      </div>
      <div class="ocr-result-card__field">
        <span class="ocr-result-card__label">发票号码</span>
        <span class="ocr-result-card__value">{{ invoiceNo || '—' }}</span>
      </div>
      <div class="ocr-result-card__field">
        <span class="ocr-result-card__label">开票日期</span>
        <span class="ocr-result-card__value">{{ invoiceDate || '—' }}</span>
      </div>
      <div class="ocr-result-card__field">
        <span class="ocr-result-card__label">价税合计</span>
        <span class="ocr-result-card__value">{{ amountLabel }}</span>
      </div>
      <div class="ocr-result-card__field ocr-result-card__field--full">
        <span class="ocr-result-card__label">销方</span>
        <span class="ocr-result-card__value">{{ sellerName || '—' }}</span>
      </div>
    </div>

    <div v-if="$slots.footer" class="ocr-result-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  provider?: string
  providerLabel?: string
  fallbackProvider?: string
  fallbackLabel?: string
  confidence?: number | string | null
  invoiceType?: string
  invoiceNo?: string
  invoiceDate?: string
  sellerName?: string
  amount?: number | string | null
}>()

const amountLabel = computed(() => {
  const val = Number(props.amount ?? 0)
  if (!Number.isFinite(val) || !val) {
    return '—'
  }
  return `¥${val.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
})
</script>

<style scoped lang="less">
.ocr-result-card {
  padding: 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
  border: 1px solid #dde7f5;
}

.ocr-result-card__header,
.ocr-result-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.ocr-result-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #10233f;
}

.ocr-result-card__meta {
  margin-top: 6px;
  font-size: 13px;
  color: #6d809b;
}

.ocr-result-card__confidence {
  padding: 8px 12px;
  border-radius: 999px;
  background: #e8f2ff;
  color: #2f63e6;
  font-size: 14px;
  font-weight: 700;
}

.ocr-result-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.ocr-result-card__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #edf2fa;
}

.ocr-result-card__field--full {
  grid-column: 1 / -1;
}

.ocr-result-card__label {
  font-size: 12px;
  color: #70839b;
}

.ocr-result-card__value {
  font-size: 14px;
  font-weight: 600;
  color: #10233f;
}

.ocr-result-card__footer {
  margin-top: 18px;
}
</style>
