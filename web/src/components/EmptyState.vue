<template>
  <div class="portal-empty-state">
    <div class="portal-empty-state__icon">
      <slot name="icon">·</slot>
    </div>
    <div class="portal-empty-state__title">{{ title }}</div>
    <div v-if="showDescription && description" class="portal-empty-state__description">{{ description }}</div>
    <div v-if="$slots.action" class="portal-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  showDescription?: boolean
}>(), {
  description: '',
  showDescription: false,
})
</script>

<style scoped lang="less">
.portal-empty-state {
  padding: 36px 20px;
  text-align: center;
  border-radius: 24px;
  background: linear-gradient(180deg, #fcfdff 0%, #f5f8fd 100%);
  border: 1px dashed #d9e4f1;
}

.portal-empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 20px;
  background: #eef4ff;
  color: #2f63e6;
  font-size: 26px;
}

.portal-empty-state__title {
  font-size: 18px;
  font-weight: 700;
  color: #10233f;
}

.portal-empty-state__description {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #7587a2;
}

.portal-empty-state__action {
  margin-top: 18px;
}
</style>
