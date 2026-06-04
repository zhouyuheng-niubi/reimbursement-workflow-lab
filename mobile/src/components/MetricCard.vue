<template>
  <view class="metric-card">
    <view class="metric-card__label">{{ label }}</view>
    <view class="metric-card__value">{{ value }}</view>
    <view v-if="showMeta && meta" class="muted-text" style="margin-top: 8rpx">{{ meta }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  meta?: string
  showMeta?: boolean
}>()
</script>
