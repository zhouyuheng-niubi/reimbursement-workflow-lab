<template>
  <view class="tabbar safe-bottom">
    <view
      v-for="item in items"
      :key="item.key"
      class="tabbar__item"
      :class="{ 'tabbar__item--active': item.key === current }"
      @click="go(item.path)"
    >
      <text class="tabbar__label">{{ item.label }}</text>
      <view class="tabbar__dot" />
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: 'home' | 'reimbursement' | 'approval' | 'profile'
}>()

const items = [
  { key: 'home', label: '首页', path: '/pages/home/index' },
  { key: 'reimbursement', label: '报销', path: '/pages/reimbursement/list' },
  { key: 'approval', label: '审批', path: '/pages/approval/pending' },
  { key: 'profile', label: '我的', path: '/pages/profile/index' },
]

function go(path: string) {
  uni.reLaunch({ url: path })
}
</script>

<style scoped lang="scss">
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  padding: 18rpx 24rpx 20rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(24rpx);
  box-shadow: 0 -10rpx 36rpx rgba(16, 35, 63, 0.08);
}

.tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  color: #7b8ba5;
}

.tabbar__item--active {
  color: #2e63e8;
}

.tabbar__label {
  font-size: 22rpx;
  font-weight: 600;
}

.tabbar__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: transparent;
}

.tabbar__item--active .tabbar__dot {
  background: linear-gradient(135deg, #326bff 0%, #75a3ff 100%);
}
</style>
