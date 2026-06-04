<template>
  <div class="action-bar">
    <div class="action-bar__content">
      <div class="action-bar__title">{{ title }}</div>
      <div v-if="showDescription && description" class="action-bar__description">{{ description }}</div>
    </div>
    <div class="action-bar__actions">
      <slot />
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
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(47, 99, 230, 0.08) 0%, rgba(119, 163, 255, 0.08) 100%);
  border: 1px solid rgba(47, 99, 230, 0.12);
}

.action-bar__title {
  font-size: 16px;
  font-weight: 700;
  color: #10233f;
}

.action-bar__description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #6f819a;
}

.action-bar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
