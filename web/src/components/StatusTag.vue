<template>
  <a-tag :color="tagConfig.color" class="status-tag" :bordered="false">
    <template #icon v-if="tagConfig.icon">
      <component :is="tagConfig.icon" />
    </template>
    {{ label || tagConfig.text }}
  </a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PayCircleOutlined,
  StopOutlined
} from '@ant-design/icons-vue'

const props = defineProps<{
  status: number | string // 后端返回的 status 字段 (0-7)
  label?: string // 后端返回的 statusLabel 兜底显示
}>()

// 0:草稿, 1:待审批, 2:审批中, 3:已通过, 4:已驳回, 5:已撤回, 6:已付款, 7:已关闭
const statusMap: Record<string, { color: string, text: string, icon?: any }> = {
  '0': { color: 'default', text: '草稿', icon: ClockCircleOutlined },
  '1': { color: 'orange', text: '待审批', icon: ClockCircleOutlined },
  '2': { color: 'processing', text: '审批中', icon: SyncOutlined },
  '3': { color: 'success', text: '已通过', icon: CheckCircleOutlined },
  '4': { color: 'error', text: '已驳回', icon: CloseCircleOutlined },
  '5': { color: 'default', text: '已撤回', icon: MinusCircleOutlined },
  '6': { color: 'cyan', text: '已付款', icon: PayCircleOutlined },
  '7': { color: 'default', text: '已关闭', icon: StopOutlined },
  'pending_payment': { color: 'orange', text: '待付款', icon: PayCircleOutlined }
}

const tagConfig = computed(() => {
  const s = String(props.status)
  return statusMap[s] || { color: 'default', text: props.label || '未知' }
})
</script>

<style scoped lang="less">
.status-tag {
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
