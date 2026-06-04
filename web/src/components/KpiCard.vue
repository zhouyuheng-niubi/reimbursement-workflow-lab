<template>
  <div class="portal-kpi-card" :class="`portal-kpi-card--${tone}`">
    <div class="portal-kpi-card__header">
      <div class="portal-kpi-card__label">{{ label }}</div>
      <div v-if="$slots.icon" class="portal-kpi-card__icon">
        <slot name="icon" />
      </div>
    </div>
    <div class="portal-kpi-card__value">
      <slot name="value">{{ value }}</slot>
    </div>
    <div v-if="showMeta && (meta || $slots.meta)" class="portal-kpi-card__meta">
      <slot name="meta">{{ meta }}</slot>
    </div>
    <div v-if="$slots.footer" class="portal-kpi-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value?: string | number
  meta?: string
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate'
  showMeta?: boolean
}>(), {
  value: '--',
  meta: '',
  tone: 'blue',
  showMeta: false,
})
</script>

<style scoped lang="less">
.portal-kpi-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #e5edf8;
  box-shadow: 0 18px 40px rgba(15, 35, 73, 0.08);

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 4px;
    opacity: 0.95;
  }

  &--blue::before { background: linear-gradient(90deg, #2f63e6 0%, #77a3ff 100%); }
  &--green::before { background: linear-gradient(90deg, #16a34a 0%, #6dd89a 100%); }
  &--orange::before { background: linear-gradient(90deg, #f59e0b 0%, #ffd27a 100%); }
  &--red::before { background: linear-gradient(90deg, #ef4444 0%, #ff9d9d 100%); }
  &--slate::before { background: linear-gradient(90deg, #475569 0%, #94a3b8 100%); }
}

.portal-kpi-card__header,
.portal-kpi-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.portal-kpi-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.portal-kpi-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #eef4ff;
  color: #2f63e6;
}

.portal-kpi-card__value {
  margin-top: 14px;
  font-size: 34px;
  line-height: 1.15;
  font-weight: 700;
  color: #10233f;
}

.portal-kpi-card__meta {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #7a8aa2;
}

.portal-kpi-card__footer {
  margin-top: 16px;
}
</style>
