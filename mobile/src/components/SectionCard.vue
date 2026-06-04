<template>
  <view class="card-panel">
    <view class="card-panel__header">
      <view>
        <view class="card-panel__title">{{ title }}</view>
        <view v-if="showSubtitle && subtitle" class="card-panel__meta">{{ subtitle }}</view>
      </view>
      <slot name="extra" />
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  showSubtitle?: boolean
}>()
</script>
