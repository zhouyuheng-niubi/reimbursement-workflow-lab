<template>
  <view class="mobile-page">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">我的</view>
        <view class="page-hero__title">{{ profile.realName || profile.username || '未登录' }}</view>
        <view class="page-hero__subtitle">{{ profile.companyName || '--' }} · {{ profile.departmentName || '--' }}</view>
        <view class="hero-shortcuts">
          <view class="hero-shortcut" @click="navigate('/pages/reimbursement/list')">
            <text class="hero-shortcut__label">我的报销</text>
          </view>
          <view class="hero-shortcut" @click="navigate('/pages/approval/pending')">
            <text class="hero-shortcut__label">待我审批</text>
          </view>
        </view>
      </view>

      <SectionCard title="身份资料">
        <view class="info-list">
          <view class="info-row"><text>用户名</text><text>{{ profile.username || '--' }}</text></view>
          <view class="info-row"><text>手机号</text><text>{{ profile.phone || '--' }}</text></view>
          <view class="info-row"><text>邮箱</text><text>{{ profile.email || '--' }}</text></view>
          <view class="info-row"><text>角色</text><text>{{ (profile.roles || []).join(' / ') || '--' }}</text></view>
        </view>
      </SectionCard>

      <SectionCard title="收款账户">
        <view class="info-list">
          <view class="info-row"><text>开户行</text><text>{{ profile.bankName || '--' }}</text></view>
          <view class="info-row"><text>户名</text><text>{{ profile.bankAccountName || '--' }}</text></view>
          <view class="info-row"><text>账号</text><text>{{ profile.bankAccount || '--' }}</text></view>
        </view>
      </SectionCard>

      <SectionCard title="常用入口">
        <view class="list-stack">
          <view class="nav-item" @click="navigate('/pages/reimbursement/list')">我的报销</view>
          <view class="nav-item" @click="navigate('/pages/notification/index')">消息中心</view>
          <view class="nav-item" @click="navigate('/pages/invoice/list')">我的发票夹</view>
        </view>
      </SectionCard>

      <button class="danger-btn" @click="session.logout">退出登录</button>
    </view>

    <MobileTabBar current="profile" />
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import MobileTabBar from '@/components/MobileTabBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import { useSession } from '@/composables/useSession'
import type { UserInfo } from '@/types'

const session = useSession()
const profile = reactive<Partial<UserInfo>>({})

function navigate(path: string) {
  uni.navigateTo({ url: path })
}

async function loadProfile() {
  if (!session.requireAuth()) {
    return
  }
  const info = await session.loadUserInfo()
  Object.assign(profile, info ?? {})
}

onShow(() => {
  loadProfile()
})
</script>

<style scoped lang="scss">
.hero-shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 20rpx;
}

.hero-shortcut {
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.14);
}

.hero-shortcut__label {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.76);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row,
.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #10233f;
  border-bottom: 1rpx solid #edf2f8;
}

.nav-item:last-child,
.info-row:last-child {
  border-bottom: none;
}
</style>
