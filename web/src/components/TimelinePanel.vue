<template>
  <div class="timeline-panel">
    <div v-for="item in items" :key="item.key" class="timeline-panel__item">
      <div class="timeline-panel__rail">
        <span class="timeline-panel__dot" :class="`timeline-panel__dot--${item.status || 'pending'}`"></span>
        <span class="timeline-panel__line"></span>
      </div>
      <div class="timeline-panel__content">
        <div class="timeline-panel__title">{{ item.title }}</div>
        <div v-if="item.meta" class="timeline-panel__meta">{{ item.meta }}</div>
        <div v-if="item.description" class="timeline-panel__description">{{ item.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimelineItem } from '@/types/ui'

defineProps<{
  items: TimelineItem[]
}>()
</script>

<style scoped lang="less">
.timeline-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.timeline-panel__item {
  display: flex;
  gap: 14px;
}

.timeline-panel__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-panel__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 3px;

  &--done { background: #16a34a; }
  &--current { background: #2f63e6; }
  &--pending { background: #cbd5e1; }
  &--error { background: #ef4444; }
}

.timeline-panel__line {
  flex: 1;
  width: 2px;
  margin-top: 6px;
  background: #e5edf8;
}

.timeline-panel__item:last-child .timeline-panel__line {
  display: none;
}

.timeline-panel__title {
  font-size: 14px;
  font-weight: 700;
  color: #10233f;
}

.timeline-panel__meta {
  margin-top: 4px;
  font-size: 12px;
  color: #60738f;
}

.timeline-panel__description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #6f819a;
}
</style>
