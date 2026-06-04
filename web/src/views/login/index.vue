<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-shape bg-shape--1"></div>
      <div class="bg-shape bg-shape--2"></div>
    </div>

    <div class="login-container">
      <!-- Left Panel -->
      <div class="login-left">
        <div class="brand">
          <div class="brand-logo">
            <img src="@/assets/logo.svg" alt="logo" width="56" height="56" />
          </div>
          <h1 class="brand-name">示例地区报销智能平台</h1>
        </div>
        <div class="features">
          <div class="feature-item" v-for="item in features" :key="item.title">
            <component :is="item.icon" class="feature-icon" />
            <div>
              <div class="feature-title">{{ item.title }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel — Login Form -->
      <div class="login-right">
        <div class="login-card">
          <h2 class="card-title">欢迎回来</h2>

          <a-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            layout="vertical"
            class="login-form"
            @finish="handleSubmit"
          >
            <a-form-item name="username">
              <a-input
                v-model:value="formData.username"
                size="large"
                placeholder="请输入账号/手机号"
                :maxlength="50"
                allow-clear
              >
                <template #prefix><UserOutlined class="input-icon" /></template>
              </a-input>
            </a-form-item>

            <a-form-item name="password">
              <a-input-password
                v-model:value="formData.password"
                size="large"
                placeholder="请输入密码"
                :maxlength="30"
              >
                <template #prefix><LockOutlined class="input-icon" /></template>
              </a-input-password>
            </a-form-item>

            <div class="form-extra">
              <a-checkbox v-model:checked="rememberMe">记住我</a-checkbox>
              <a class="forgot-link" @click="handleForgotPassword">忘记密码？</a>
            </div>

            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="loading"
                class="submit-btn"
              >
                {{ loading ? '登录中...' : '登 录' }}
              </a-button>
            </a-form-item>
          </a-form>
        </div>

        <p class="login-footer">
          © {{ currentYear }} 示例地区科技有限公司 版权所有
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form/interface'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(false)
const currentYear = new Date().getFullYear()

const formData = reactive({
  username: 'admin',
  password='<REDACTED_CREDENTIAL>',
})

const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 2, max: 50, message: '账号长度为 2-50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于 6 个字符', trigger: 'blur' },
  ],
}

const features = [
  {
    icon: 'FileTextOutlined',
    title: '智能报销',
  },
  {
    icon: 'CheckCircleOutlined',
    title: '审批流引擎',
  },
  {
    icon: 'BarChartOutlined',
    title: '数据分析',
  },
]

async function handleSubmit() {
  try {
    loading.value = true
    await userStore.login({
      username: formData.username,
      password: formData.password,
    })
    message.success('登录成功，欢迎回来！')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch {
    // login failed, error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  message.info('请联系系统管理员重置密码')
}

</script>

<style scoped lang="less">
/* ── Keyframe Animations ── */
@keyframes float-1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(40px, -30px) scale(1.06);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.97);
  }
}

@keyframes float-2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-35px, 25px) scale(1.05);
  }
  70% {
    transform: translate(20px, -15px) scale(0.96);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(16px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-28px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* ── Page Wrapper ── */
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0f1a30 100%);
  overflow: hidden;
}

/* ── Background Light Orbs ── */
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);

  &--1 {
    width: 640px;
    height: 640px;
    bottom: -140px;
    left: -140px;
    background: radial-gradient(
      circle at center,
      rgba(79, 110, 247, 0.45) 0%,
      rgba(123, 147, 255, 0.22) 45%,
      transparent 70%
    );
    animation: float-1 14s ease-in-out infinite;
  }

  &--2 {
    width: 560px;
    height: 560px;
    top: -100px;
    right: -100px;
    background: radial-gradient(
      circle at center,
      rgba(139, 92, 246, 0.40) 0%,
      rgba(79, 110, 247, 0.20) 45%,
      transparent 70%
    );
    animation: float-2 18s ease-in-out infinite;
  }
}

/* ── Main Container ── */
.login-container {
  position: relative;
  display: flex;
  width: 940px;
  max-width: calc(100vw - 48px);
  min-height: 580px;
  border-radius: var(--r-2xl);
  overflow: hidden;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: fadeInScale 0.6s var(--ease-out) both;
}

/* ── Left Panel ── */
.login-left {
  flex: 1;
  padding: 52px 44px;
  background: linear-gradient(
    150deg,
    rgba(79, 110, 247, 0.18) 0%,
    rgba(139, 92, 246, 0.12) 50%,
    rgba(15, 23, 42, 0.20) 100%
  );
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;
  animation: fadeInLeft 0.7s var(--ease-out) 0.1s both;
}

.brand {
  margin-bottom: 44px;
}

.brand-logo {
  margin-bottom: 20px;
  filter: drop-shadow(0 0 16px rgba(79, 110, 247, 0.6));
  transition: filter var(--duration-normal) var(--ease-out);

  &:hover {
    filter: drop-shadow(0 0 24px rgba(123, 147, 255, 0.8));
  }
}

.brand-name {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
  background: linear-gradient(
    120deg,
    #ffffff 0%,
    #c7d2fe 40%,
    #a5b4fc 70%,
    #818cf8 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 5s ease-in-out infinite;
}

.brand-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.02em;
  font-weight: 400;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all var(--duration-normal) var(--ease-out);
  cursor: default;

  &:nth-child(1) {
    animation: fadeInUp 0.5s var(--ease-out) 0.25s both;
  }
  &:nth-child(2) {
    animation: fadeInUp 0.5s var(--ease-out) 0.38s both;
  }
  &:nth-child(3) {
    animation: fadeInUp 0.5s var(--ease-out) 0.51s both;
  }

  &:hover {
    background: rgba(79, 110, 247, 0.14);
    border-color: rgba(123, 147, 255, 0.25);
    transform: translateX(4px);
  }
}

.feature-icon {
  font-size: 22px;
  color: var(--primary-light);
  margin-top: 2px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(123, 147, 255, 0.5));
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 3px;
  letter-spacing: 0.01em;
}

.feature-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

/* ── Right Panel ── */
.login-right {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  padding: 44px 40px 28px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* ── Login Card (glass panel) ── */
.login-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-2xl);
  padding: 36px 32px 28px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: fadeInScale 0.65s var(--ease-out) 0.18s both;
}

.card-title {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.card-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 30px;
  letter-spacing: 0.01em;
}

/* ── Form & Inputs ── */
.login-form {
  // Override Ant Design input styles inside the dark card
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-input) {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: var(--r-md) !important;
    color: #fff !important;
    font-size: 14px;
    transition:
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out) !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.3) !important;
    }

    &:hover {
      border-color: rgba(123, 147, 255, 0.5) !important;
      background: rgba(255, 255, 255, 0.11) !important;
    }
  }

  :deep(.ant-input-affix-wrapper-focused),
  :deep(.ant-input-affix-wrapper:focus-within) {
    border-color: var(--primary-light) !important;
    background: rgba(79, 110, 247, 0.12) !important;
    box-shadow:
      0 0 0 3px rgba(79, 110, 247, 0.22),
      0 0 16px rgba(123, 147, 255, 0.18) !important;
  }

  :deep(.ant-input-password input) {
    background: transparent !important;
    color: #fff !important;
  }

  :deep(.anticon.ant-input-password-icon) {
    color: rgba(255, 255, 255, 0.4) !important;

    &:hover {
      color: rgba(255, 255, 255, 0.75) !important;
    }
  }

  :deep(.ant-form-item-explain-error) {
    font-size: 12px;
    color: #fca5a5 !important;
  }

  .input-icon {
    color: rgba(255, 255, 255, 0.4);
  }
}

.form-extra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  :deep(.ant-checkbox-wrapper) {
    color: rgba(255, 255, 255, 0.65);
    font-size: 13px;
  }

  :deep(.ant-checkbox-inner) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
    border-radius: 5px !important;
  }

  :deep(.ant-checkbox-checked .ant-checkbox-inner) {
    background: var(--primary) !important;
    border-color: var(--primary) !important;
  }
}

.forgot-link {
  font-size: 13px;
  color: rgba(165, 180, 252, 0.85);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);
  text-decoration: none;

  &:hover {
    color: #c7d2fe;
  }
}

/* ── Submit Button ── */
.submit-btn {
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 6px;
  border-radius: var(--r-lg) !important;
  border: none !important;
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-light) 100%
  ) !important;
  background-size: 200% 200% !important;
  box-shadow:
    0 4px 16px rgba(79, 110, 247, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.15) inset !important;
  transition:
    transform var(--duration-fast) var(--ease-spring),
    box-shadow var(--duration-fast) var(--ease-out) !important;

  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.01) !important;
    box-shadow:
      0 8px 28px rgba(79, 110, 247, 0.55),
      0 1px 0 rgba(255, 255, 255, 0.2) inset !important;
    background: linear-gradient(
      135deg,
      var(--primary-light) 0%,
      #a5b4fc 100%
    ) !important;
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98) !important;
    box-shadow:
      0 2px 8px rgba(79, 110, 247, 0.35) !important;
  }
}

/* ── Divider ── */
.divider {
  margin: 20px 0 !important;

  :deep(.ant-divider-inner-text) {
    padding: 0 12px;
  }

  :deep(&::before),
  :deep(&::after) {
    border-color: rgba(255, 255, 255, 0.12) !important;
  }

  .divider-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
}

/* ── Third-party Login Icons ── */
.other-login {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 4px;
}

.other-login-btn {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
  transition:
    transform var(--duration-normal) var(--ease-spring),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);

  &:hover {
    transform: scale(1.18);
    border-color: rgba(123, 147, 255, 0.6);
    color: var(--primary-light);
    background: rgba(79, 110, 247, 0.15);
    box-shadow: 0 0 14px rgba(79, 110, 247, 0.3);
  }

  &:active {
    transform: scale(0.96);
  }
}

/* ── Footer ── */
.login-footer {
  margin-top: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.28);
  text-align: center;
  letter-spacing: 0.02em;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .login-left {
    display: none;
  }

  .login-container {
    width: 100%;
    max-width: 440px;
  }

  .login-right {
    width: 100%;
    padding: 36px 24px 24px;
    background: rgba(15, 23, 42, 0.92);
  }

  .login-card {
    padding: 28px 20px 22px;
  }
}
</style>
