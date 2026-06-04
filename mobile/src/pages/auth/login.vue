<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__title">登录</view>
      </view>

      <view class="card-panel">
        <view class="card-panel__header">
          <view class="card-panel__title">账号</view>
        </view>

        <view class="form-field">
          <text class="form-field__label">用户名</text>
          <input v-model="form.username" class="input-box" placeholder="请输入用户名" />
        </view>
        <view class="form-field">
          <text class="form-field__label">密码</text>
          <input v-model="form.password" class="input-box" password placeholder="请输入密码" />
        </view>

        <button class="primary-btn" :disabled="loading" @click="handleLogin">
          {{ loading ? '登录中...' : '登录并进入工作台' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { login } from '@/composables/useSession'

const form = reactive({
  username: 'admin',
  password='<REDACTED_CREDENTIAL>',
})
const loading = ref(false)

async function handleLogin() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await login({ username: form.username, password: form.password })
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>
