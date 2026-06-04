<template>
  <div class="risk-banner" :class="`risk-banner--${tone}`">
    <div class="risk-banner__dot"></div>
    <div class="risk-banner__body">
      <div class="risk-banner__title">{{ title }}</div>
      <div v-if="description" class="ri<REDACTED_CREDENTIAL>">{{ description }}</div>
    </div>
    <div v-if="$slots.action" class="risk-banner__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  tone?: 'warning' | 'danger' | 'info' | 'success'
}>(), {
  description: '',
  tone: 'warning',
})
</script>

<style scoped lang="less">
.risk-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid transparent;

  &--warning {
    background: #fff7eb;
    border-color: #ffe0b8;
  }

  &--danger {
    background: #fff2f2;
    border-color: #ffcfcf;
  }

  &--info {
    background: #eef5ff;
    border-color: #d8e7ff;
  }

  &--success {
    background: #edf9f1;
    border-color: #cfeeda;
  }
}

.risk-banner__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 7px;
  background: currentColor;
  color: #f59e0b;
}

.risk-banner--danger .risk-banner__dot { color: #ef4444; }
.risk-banner--info .risk-banner__dot { color: #2f63e6; }
.risk-banner--success .risk-banner__dot { color: #16a34a; }

.risk-banner__body {
  flex: 1;
  min-width: 0;
}

.risk-banner__title {
  font-size: 14px;
  font-weight: 700;
  color: #10233f;
}

.ri<REDACTED_CREDENTIAL> {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #667892;
}

.risk-banner__action {
  flex-shrink: 0;
}
</style>
