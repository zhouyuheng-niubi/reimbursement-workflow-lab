<template>
  <span class="amount-display" :class="{ 'is-bold': bold, [`size-${size}`]: true, 'has-color': colored }">
    <span class="currency" v-if="showCurrency">{{ currency }}</span>
    <span class="value">{{ formattedValue }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  amount: number | string | null | undefined
  showCurrency?: boolean
  currency?: string
  bold?: boolean
  colored?: boolean // 是否应用颜色（正数默认黑/蓝，负数红等，这里简化为主要颜色）
  size?: 'small' | 'medium' | 'large' // 字体大小
}>(), {
  showCurrency: true,
  currency: '¥',
  bold: false,
  colored: false,
  size: 'medium'
})

const formattedValue = computed(() => {
  if (props.amount === null || props.amount === undefined || props.amount === '') {
    return '0.00'
  }
  const val = Number(props.amount)
  if (isNaN(val)) return '0.00'
  
  // 千分位格式化并保留两位小数
  return val.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})
</script>

<style scoped lang="less">
.amount-display {
  display: inline-flex;
  align-items: baseline;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; // 数字更清晰的字体
  color: var(--color-text, #1e293b);

  &.is-bold {
    font-weight: 600;
  }

  &.has-color {
    color: var(--color-primary, #3b82f6);
  }

  &.size-small {
    font-size: 13px;
    .currency { font-size: 12px; }
  }

  &.size-medium {
    font-size: 16px;
    .currency { font-size: 14px; }
  }

  &.size-large {
    font-size: 24px;
    .currency { font-size: 18px; }
  }

  .currency {
    margin-right: 2px;
    color: var(--color-text-tertiary, #64748b);
  }
}
</style>
