<template>
  <view class="status-pill" :class="`status-pill--${tone}`">
    <text>{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { statusLabel, statusTone } from '@/utils/format'

const props = defineProps<{
  status?: number
  label?: string
}>()

const text = computed(() => statusLabel(props.status, props.label))
const tone = computed(() => statusTone(props.status))
</script>

<style scoped lang="scss">
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;

  &--slate {
    color: #556780;
    background: #eaf0f7;
  }

  &--blue {
    color: #2f63e6;
    background: #eaf2ff;
  }

  &--green,
  &--emerald {
    color: #158856;
    background: #eafaf1;
  }

  &--red {
    color: #d44848;
    background: #fff1f1;
  }

  &--orange {
    color: #c67722;
    background: #fff5e9;
  }

  &--gray {
    color: #708198;
    background: #edf2f8;
  }
}
</style>
