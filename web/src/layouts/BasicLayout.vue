<template>
  <a-layout class="portal-layout">
    <aside class="portal-layout__aside" :class="{ 'portal-layout__aside--collapsed': collapsed }">
      <div class="brand-panel" @click="router.push('/dashboard')">
        <img src="@/assets/logo.svg" alt="示例地区报销" class="brand-panel__logo" />
        <div v-if="!collapsed" class="brand-panel__meta">
          <div class="brand-panel__title">示例地区智能报销平台</div>
        </div>
      </div>

      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        class="portal-menu"
        :inline-collapsed="collapsed"
        @click="handleMenuClick"
      >
        <template v-for="item in filteredMenus" :key="item.key">
          <a-sub-menu v-if="item.children" :key="item.key">
            <template #icon><component :is="iconMap[item.icon!]" /></template>
            <template #title>{{ item.title }}</template>
            <a-menu-item v-for="child in item.children" :key="child.key">
              <span>{{ child.title }}</span>
              <a-badge v-if="child.badge === 'pending'" :count="pendingCount" :offset="[10, 0]" size="small" />
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item v-else :key="item.key">
            <template #icon><component :is="iconMap[item.icon!]" /></template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </template>
      </a-menu>

      <div class="portal-layout__aside-footer">
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <MenuFoldOutlined v-if="!collapsed" />
          <MenuUnfoldOutlined v-else />
        </button>
      </div>
    </aside>

    <a-layout class="portal-layout__main">
      <header class="portal-header">
        <div class="portal-header__left">
          <div class="portal-header__title">{{ route.meta.title || '示例地区智能报销平台' }}</div>
        </div>

        <div class="portal-header__right">
          <a-input-search
            v-model:value="globalKeyword"
            class="portal-header__search"
            placeholder="全局检索报销单号 / 标题 / 申请人"
            allow-clear
            @search="handleGlobalSearch"
          />
          <NotificationBell />
          <a-dropdown placement="bottomRight">
            <div class="user-entry">
              <a-avatar :size="36" class="user-entry__avatar">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <div class="user-entry__meta">
                <div class="user-entry__name">{{ userInfo?.realName || userInfo?.username || '用户' }}</div>
                <div class="user-entry__roles">{{ roleSummary }}</div>
              </div>
              <DownOutlined class="user-entry__icon" />
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" @click="router.push('/profile')">个人中心</a-menu-item>
                <a-menu-item key="guide" @click="router.push('/help/guide')">操作说明</a-menu-item>
                <a-menu-item key="messages" @click="router.push('/notification/list')">消息中心</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </header>

      <div class="portal-strip">
        <button
          v-for="portal in visiblePortals"
          :key="portal.key"
          class="portal-strip__item"
          :class="{ 'portal-strip__item--active': portal.key === currentPortal }"
          @click="navigateToPortal(portal.key)"
        >
          <span class="portal-strip__label">{{ portal.label }}</span>
        </button>
      </div>

      <main class="portal-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeOutlined,
  UserOutlined,
  AuditOutlined,
  AccountBookOutlined,
  SettingOutlined,
  ProjectOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import NotificationBell from '@/components/NotificationBell.vue'
import { menuConfig } from '@/router/menus'
import { useDashboardCountStore } from '@/stores/dashboardCount'
import { useUserStore } from '@/stores/user'
import type { MenuItem } from '@/types/api'
import type { PortalKind } from '@/types/ui'

const iconMap: Record<string, any> = {
  HomeOutlined,
  UserOutlined,
  AuditOutlined,
  AccountBookOutlined,
  SettingOutlined,
  ProjectOutlined,
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const dashboardCount = useDashboardCountStore()
const { pendingApprovalCount: pendingCount } = storeToRefs(dashboardCount)

const collapsed = ref(false)
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])
const globalKeyword = ref('')
const cachedViews = ref<string[]>(['Dashboard'])

const userInfo = computed(() => userStore.userInfo)
const currentPortal = computed<PortalKind>(() => (route.meta.portal as PortalKind) || 'workspace')
const roleSummary = computed(() => {
  const roles = userInfo.value?.roles || []
  if (!roles.length) return '当前角色未识别'
  return roles.join(' / ')
})

const visiblePortals = computed(() => {
  const roles = userInfo.value?.roles || []
  const base = [
    { key: 'workspace' as PortalKind, label: '我的工作台', path: '/dashboard' },
    { key: 'employee' as PortalKind, label: '我要报销', path: '/invoice/ocr' },
  ]
  if (roles.some(role => ['APPROVER', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role))) {
    base.push({ key: 'approval', label: '我要审批', path: '/approval/pending' })
  }
  if (roles.some(role => ['FINANCE', 'ADMIN', 'SUPER_ADMIN'].includes(role))) {
    base.push({ key: 'finance', label: '我要付款', path: '/payment/list' })
  }
  if (roles.some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role))) {
    base.push({ key: 'governance', label: '治理配置', path: '/approval/flow' })
    base.push({ key: 'insight', label: '数据与日志', path: '/report/dashboard' })
  }
  return base
})

function filterMenuByRole(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter((item) => {
      if (!item.roles?.length) return true
      return userStore.hasAnyRole(item.roles)
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0)
}

const filteredMenus = computed(() => filterMenuByRole(menuConfig))

function navigateToPortal(portal: PortalKind) {
  const target = visiblePortals.value.find(item => item.key === portal)
  if (target) {
    router.push(target.path)
  }
}

function handleGlobalSearch() {
  if (!globalKeyword.value.trim()) {
    return
  }
  router.push({
    path: '/reimbursement/list',
    query: { keyword: globalKeyword.value.trim() },
  })
}

function handleMenuClick({ key }: { key: string | number }) {
  router.push(String(key))
}

function handleLogout() {
  Modal.confirm({
    title: '确认退出登录',
    content: '退出后将返回登录页。',
    okText: '退出登录',
    cancelText: '取消',
    onOk: async () => {
      await userStore.logout()
      router.push('/login')
    },
  })
}

function resolveOpenKey() {
  const isFinanceInvoice = route.path === '/invoice/list' && route.query.mode === 'finance'
  selectedKeys.value = [isFinanceInvoice ? '/invoice/list?mode=finance' : route.path]

  if (route.path.startsWith('/invoice') || route.path.startsWith('/reimbursement')) {
    openKeys.value = ['employee-portal']
    if (isFinanceInvoice) openKeys.value = ['finance-portal']
  } else if (route.path.startsWith('/approval') && !route.path.startsWith('/approval/flow')) {
    openKeys.value = ['approval-portal']
  } else if (route.path.startsWith('/payment')) {
    openKeys.value = ['finance-portal']
  } else if (route.path.startsWith('/system') || route.path.startsWith('/approval/flow')) {
    openKeys.value = ['governance-portal']
  } else if (route.path.startsWith('/organization') || route.path.startsWith('/project') || route.path.startsWith('/report')) {
    openKeys.value = ['insight-portal']
  } else {
    openKeys.value = []
  }
}

watch(
  () => route.fullPath,
  () => {
    resolveOpenKey()
    dashboardCount.fetchPendingCount(true).catch(() => undefined)
  },
  { immediate: true },
)
</script>

<style scoped lang="less">
.portal-layout {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(74, 144, 255, 0.18), transparent 24%),
    radial-gradient(circle at top right, rgba(40, 196, 167, 0.12), transparent 18%),
    #f4f7fb;
}

.portal-layout__aside {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  width: 272px;
  display: flex;
  flex-direction: column;
  padding: 18px 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(22px);
  border-right: 1px solid rgba(217, 227, 243, 0.96);
  box-shadow: 24px 0 60px rgba(15, 35, 73, 0.06);
  transition: width 0.22s ease, padding 0.22s ease;
}

.portal-layout__aside--collapsed {
  width: 92px;
  padding-inline: 12px;
}

.brand-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 14px 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, #102c5a 0%, #2f63e6 100%);
  color: #fff;
  cursor: pointer;
}

.brand-panel__logo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.brand-panel__title {
  font-size: 17px;
  font-weight: 700;
}

.brand-panel__subtitle {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

.portal-layout__aside-note {
  margin-top: 18px;
  padding: 16px;
  border-radius: 22px;
  background: #f7faff;
  border: 1px solid #e4ecf8;
}

.portal-layout__aside-note-title {
  font-size: 13px;
  font-weight: 700;
  color: #2f63e6;
}

.portal-layout__aside-note-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.65;
  color: #6e819b;
}

.portal-menu {
  margin-top: 16px;
  flex: 1;
  background: transparent;
  border: none;
}

:deep(.portal-menu.ant-menu) {
  background: transparent;
}

:deep(.portal-menu .ant-menu-item),
:deep(.portal-menu .ant-menu-submenu-title) {
  margin: 4px 0 !important;
  border-radius: 16px !important;
  height: 46px;
  line-height: 46px;
}

:deep(.portal-menu .ant-menu-item-selected) {
  background: linear-gradient(135deg, rgba(47, 99, 230, 0.12), rgba(119, 163, 255, 0.18)) !important;
  color: #2f63e6 !important;
}

:deep(.portal-menu .ant-menu-sub) {
  background: #f9fbff !important;
  border-radius: 18px;
  margin-top: 6px !important;
  padding: 8px 0;
}

.portal-layout__aside-footer {
  padding-top: 12px;
}

.collapse-btn {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  border: 1px solid #dbe6f4;
  background: #fff;
  color: #49627e;
  cursor: pointer;
}

.portal-layout__main {
  margin-left: 272px;
  min-height: 100vh;
  transition: margin-left 0.22s ease;
}

.portal-layout__aside--collapsed + .portal-layout__main {
  margin-left: 92px;
}

.portal-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 28px 16px;
  background: rgba(244, 247, 251, 0.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(217, 227, 243, 0.9);
}

.portal-header__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2f63e6;
  text-transform: uppercase;
}

.portal-header__title {
  margin-top: 6px;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  color: #10233f;
}

.portal-header__hint {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #6c809a;
  max-width: 720px;
}

.portal-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.portal-header__search {
  width: 320px;
}

:deep(.portal-header__search .ant-input-affix-wrapper) {
  border-radius: 16px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.92);
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e4ecf8;
  cursor: pointer;
}

.user-entry__avatar {
  background: linear-gradient(135deg, #2f63e6 0%, #7aa5ff 100%);
}

.user-entry__name {
  font-size: 14px;
  font-weight: 700;
  color: #10233f;
}

.user-entry__roles {
  font-size: 12px;
  color: #72839c;
}

.user-entry__icon {
  color: #8293aa;
}

.portal-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 18px 28px 0;
}

.portal-strip__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  min-height: 74px;
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid #e3ebf8;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.portal-strip__item:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15, 35, 73, 0.08);
}

.portal-strip__item--active {
  border-color: #bfd4ff;
  background: linear-gradient(135deg, rgba(47, 99, 230, 0.1), rgba(119, 163, 255, 0.12));
}

.portal-strip__label {
  font-size: 15px;
  font-weight: 700;
  color: #10233f;
}

.portal-strip__desc {
  font-size: 12px;
  line-height: 1.6;
  color: #73859d;
  text-align: left;
}

.portal-content {
  padding: 22px 28px 32px;
}

@media (max-width: 1200px) {
  .portal-header {
    flex-direction: column;
  }

  .portal-header__right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 960px) {
  .portal-layout__aside {
    position: static;
    width: 100%;
    min-height: auto;
  }

  .portal-layout__main,
  .portal-layout__aside--collapsed + .portal-layout__main {
    margin-left: 0;
  }

  .portal-header__right {
    flex-wrap: wrap;
  }

  .portal-header__search {
    width: 100%;
  }
}
</style>
