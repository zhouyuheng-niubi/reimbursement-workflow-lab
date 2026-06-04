<template>
  <div class="page-container portal-dashboard">
    <section class="portal-hero">
      <div>
        <div class="portal-hero__eyebrow">{{ currentRoleLabel }}</div>
        <h1 class="portal-hero__title">{{ greeting }}，{{ userInfo?.realName || '用户' }}</h1>
      </div>
      <div class="portal-hero__aside">
        <div class="portal-hero__date">{{ currentDate }}</div>
        <div class="portal-hero__company">{{ userInfo?.companyName || '示例地区智能报销平台' }}</div>
      </div>
    </section>

    <ActionBar :title="nextAction.title" class="portal-dashboard__action-bar">
      <a-button type="primary" size="large" @click="router.push(nextAction.path)">
        {{ nextAction.cta }}
      </a-button>
      <a-button v-if="secondaryAction" size="large" @click="router.push(secondaryAction.path)">
        {{ secondaryAction.cta }}
      </a-button>
    </ActionBar>

    <a-row :gutter="[18, 18]" class="portal-dashboard__kpis">
      <a-col v-for="card in kpiCards" :key="card.key" :xs="24" :sm="12" :xl="6">
        <KpiCard :label="card.label" :value="card.value" :meta="card.meta" :tone="card.tone">
          <template #icon>
            <component :is="card.icon" />
          </template>
          <template #footer>
            <a-button type="link" size="small" @click="router.push(card.path)">{{ card.footer }}</a-button>
          </template>
        </KpiCard>
      </a-col>
    </a-row>

    <a-row :gutter="[18, 18]" class="portal-dashboard__content">
      <a-col :xs="24" :xl="15">
        <a-card class="portal-card" :bordered="false">
          <template #title>快捷入口</template>
          <div class="next-action-grid">
            <button
              v-for="action in roleActions"
              :key="action.key"
              class="next-action-card"
              :class="`next-action-card--${action.tone || 'blue'}`"
              @click="router.push(action.path)"
            >
              <div class="next-action-card__title">{{ action.title }}</div>
            </button>
          </div>
        </a-card>

        <a-card class="portal-card" :bordered="false">
          <template #title>最新记录</template>
          <template v-if="timelineItems.length">
            <TimelinePanel :items="timelineItems" />
          </template>
          <EmptyState v-else title="暂无记录" />
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="9">
        <a-card class="portal-card" :bordered="false">
          <template #title>异常</template>
          <div class="risk-stack">
            <RiskBanner
              v-for="risk in riskNotices"
              :key="risk.title"
              :title="risk.title"
              :description="risk.description"
              :tone="risk.tone"
            />
            <EmptyState v-if="!riskNotices.length" title="暂无异常" />
          </div>
        </a-card>

        <a-card class="portal-card" :bordered="false">
          <template #title>最新通知</template>
          <div v-if="notifications.length" class="notification-stack">
            <button
              v-for="item in notifications"
              :key="item.id"
              class="notification-item"
              @click="handleNotificationClick(item)"
            >
              <div class="notification-item__title">{{ item.title }}</div>
              <div class="notification-item__meta">{{ formatRelativeTime(item.createdAt) }}</div>
            </button>
          </div>
          <EmptyState v-else title="暂无通知" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useRouter } from 'vue-router'
import {
  BellOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons-vue'
import ActionBar from '@/components/ActionBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import KpiCard from '@/components/KpiCard.vue'
import RiskBanner from '@/components/RiskBanner.vue'
import TimelinePanel from '@/components/TimelinePanel.vue'
import request from '@/utils/request'
import { fetchPendingApprovals } from '@/api/approval'
import { queryInvoices } from '@/api/invoice'
import { fetchPaymentSummary } from '@/api/payment'
import { fetchReimbursementList } from '@/api/reimbursement'
import { useUserStore } from '@/stores/user'
import type { DashboardNextAction, RiskNotice, TimelineItem } from '@/types/ui'
import { buildEmployeeNextActions, getPrimaryPortal } from '@/utils/ui'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface ReimbursementLite {
  id: number | string
  reimbNo?: string
  title: string
  totalAmount?: number
  status: number
  statusLabel?: string
  createdAt?: string
  rejectReason?: string
}

interface PendingApprovalLite {
  reimbursementId: number | string
  title?: string
  reimbNo?: string
  totalAmount?: number
  applicantName?: string
  waitingDays?: number
}

interface PaymentSummaryLite {
  pendingCount?: number
  pendingAmount?: number
  paidCount?: number
  paidAmount?: number
  failedCount?: number
  failedAmount?: number
}

interface NotificationLite {
  id: number | string
  title: string
  bizType?: string
  bizId?: number | string
  createdAt?: string
}

const router = useRouter()
const userStore = useUserStore()

const reimbursements = ref<ReimbursementLite[]>([])
const pendingApprovals = ref<PendingApprovalLite[]>([])
const paymentSummary = ref<PaymentSummaryLite>({})
const notifications = ref<NotificationLite[]>([])
const duplicateInvoiceCount = ref(0)

const userInfo = computed(() => userStore.userInfo)
const currentPortal = computed(() => getPrimaryPortal(userInfo.value?.roles || []))

const currentDate = dayjs().format('YYYY年MM月DD日 dddd')
const greeting = computed(() => {
  const hour = dayjs().hour()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const currentRoleLabel = computed(() => {
  if (currentPortal.value === 'finance') return '财务工作台'
  if (currentPortal.value === 'approval') return '审批工作台'
  if (currentPortal.value === 'workspace' && userStore.isAdmin) return '管理工作台'
  return '员工工作台'
})

const employeeActions = buildEmployeeNextActions()
const approvalActions: DashboardNextAction[] = [
  { key: 'approval-pending', title: '先处理待审批', description: '在一个界面里看清单据、发票和风险。', cta: '去审批', path: '/approval/pending', tone: 'blue' },
  { key: 'messages', title: '查看催办通知', description: '先看哪些单据被催办或等待过久。', cta: '看消息', path: '/notification/list', tone: 'orange' },
]
const financeActions: DashboardNextAction[] = [
  { key: 'payment-pool', title: '先处理待付款池', description: '优先完成确认付款，再处理失败与退款。', cta: '去付款', path: '/payment/list', tone: 'blue' },
  { key: 'ledger', title: '复核发票台账', description: '按发票视角看是否存在重复和异常。', cta: '看台账', path: '/invoice/list?mode=finance', tone: 'green' },
]

const roleActions = computed(() => {
  if (currentPortal.value === 'approval') return approvalActions
  if (currentPortal.value === 'finance') return financeActions
  return employeeActions
})

const nextAction = computed(() => roleActions.value[0])
const secondaryAction = computed(() => roleActions.value[1] || null)

const kpiCards = computed(() => {
  return [
    {
      key: 'reimbursement',
      label: currentPortal.value === 'finance' ? '待付款单据' : '我的报销',
      value: currentPortal.value === 'finance' ? String(paymentSummary.value.pendingCount || 0) : String(reimbursements.value.length),
      meta: currentPortal.value === 'finance' ? '今天需要推进的付款任务' : '最近需要你跟进的报销单据',
      tone: 'blue' as const,
      icon: FileTextOutlined,
      path: currentPortal.value === 'finance' ? '/payment/list' : '/reimbursement/list',
      footer: currentPortal.value === 'finance' ? '进入待付款池' : '查看我的报销',
    },
    {
      key: 'pending',
      label: '待我审批',
      value: String(pendingApprovals.value.length),
      meta: '需要你确认、驳回或转审的单据',
      tone: 'orange' as const,
      icon: CheckCircleOutlined,
      path: '/approval/pending',
      footer: '进入审批中心',
    },
    {
      key: 'payment',
      label: '本月已付款',
      value: `¥${Number(paymentSummary.value.paidAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      meta: '财务已确认完成的付款金额',
      tone: 'green' as const,
      icon: DollarOutlined,
      path: '/payment/list',
      footer: '查看付款管理',
    },
    {
      key: 'invoice',
      label: '异常提醒',
      value: String(duplicateInvoiceCount.value),
      meta: '重复发票、长时间未审批、被驳回单据会优先提示',
      tone: duplicateInvoiceCount.value ? 'red' as const : 'slate' as const,
      icon: BellOutlined,
      path: '/invoice/list',
      footer: '查看风险来源',
    },
  ]
})

const timelineItems = computed<TimelineItem[]>(() => {
  const items = reimbursements.value.slice(0, 4).map((item) => ({
    key: item.id,
    title: item.title || item.reimbNo || '报销单',
    meta: item.statusLabel || '处理中',
    description: item.createdAt ? `最近更新于 ${formatRelativeTime(item.createdAt)}` : '等待下一步处理',
      status: (item.status === 4 ? 'error' : item.status === 6 ? 'done' : item.status === 2 ? 'current' : 'pending') as TimelineItem['status'],
  }))

  if (currentPortal.value === 'approval') {
    return pendingApprovals.value.slice(0, 4).map((item) => ({
      key: item.reimbursementId,
      title: item.title || item.reimbNo || '待审批单据',
      meta: `${item.applicantName || '--'} · ¥${Number(item.totalAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: item.waitingDays ? `已等待 ${item.waitingDays} 天` : '等待你处理',
      status: ((item.waitingDays || 0) > 3 ? 'error' : 'current') as TimelineItem['status'],
    }))
  }

  return items
})

const riskNotices = computed<RiskNotice[]>(() => {
  const risks: RiskNotice[] = []
  if (duplicateInvoiceCount.value > 0) {
    risks.push({
      title: `发现 ${duplicateInvoiceCount.value} 条重复或异常发票记录`,
      description: '建议先在发票夹或发票台账中确认绑定关系，再继续提单或财务处理。',
      tone: 'danger',
    })
  }
  if (pendingApprovals.value.some(item => (item.waitingDays || 0) > 3)) {
    risks.push({
      title: '存在等待超过 3 天的审批单据',
      description: '这些单据更容易造成流程卡顿，建议审批角色优先处理。',
      tone: 'warning',
    })
  }
  const rejected = reimbursements.value.filter(item => item.status === 4)
  if (rejected.length > 0) {
    risks.push({
      title: `你有 ${rejected.length} 张被驳回单据待修改`,
      description: '建议先处理驳回原因明确的单据，再创建新的报销。',
      tone: 'info',
    })
  }
  return risks.slice(0, 3)
})

function formatRelativeTime(value?: string) {
  if (!value) return '刚刚'
  return dayjs(value).fromNow()
}

async function loadDashboard() {
  const [reimbData, pendingData, summaryData, invoiceData, notificationData] = await Promise.all([
    fetchReimbursementList({ page: 1, pageSize: 6 }),
    fetchPendingApprovals({ page: 1, pageSize: 6 }),
    fetchPaymentSummary(),
    queryInvoices({ page: 1, pageSize: 1, isDuplicate: 1 }),
    request.get<{ list: NotificationLite[] }>('/v1/notifications', { params: { page: 1, pageSize: 5 } }),
  ])

  reimbursements.value = reimbData.list || []
  pendingApprovals.value = pendingData.list || []
  paymentSummary.value = summaryData || {}
  duplicateInvoiceCount.value = invoiceData.total || 0
  notifications.value = notificationData.list || []
}

function handleNotificationClick(item: NotificationLite) {
  if (item.bizType === 'reimbursement' && item.bizId) {
    router.push(`/reimbursement/${item.bizId}`)
    return
  }
  if (item.bizType === 'approval') {
    router.push('/approval/pending')
    return
  }
  router.push('/notification/list')
}

onMounted(() => {
  loadDashboard().catch(() => undefined)
})
</script>

<style scoped lang="less">
.portal-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.portal-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 30px 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, #102c5a 0%, #2f63e6 55%, #6b9fff 100%);
  color: #fff;
  box-shadow: 0 28px 56px rgba(35, 73, 151, 0.2);
}

.portal-hero__eyebrow {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.portal-hero__title {
  margin-top: 14px;
  font-size: 34px;
  line-height: 1.16;
  font-weight: 700;
}

.portal-hero__subtitle {
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.84);
  max-width: 700px;
}

.portal-hero__aside {
  text-align: right;
}

.portal-hero__date {
  font-size: 16px;
  font-weight: 700;
}

.portal-hero__company {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.portal-card {
  border-radius: 26px;
}

.portal-dashboard__action-bar,
.portal-dashboard__kpis,
.portal-dashboard__content {
  animation: pageEnter 0.35s ease both;
}

.next-action-grid,
.risk-stack,
.notification-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.next-action-card,
.notification-item {
  width: 100%;
  text-align: left;
  padding: 18px 20px;
  border-radius: 22px;
  border: 1px solid #e4ebf7;
  background: #f9fbff;
  cursor: pointer;
}

.next-action-card__title,
.notification-item__title {
  font-size: 15px;
  font-weight: 700;
  color: #10233f;
}

.next-action-card__description,
.notification-item__meta {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #71839c;
}

.next-action-card__cta {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #2f63e6;
}

.next-action-card--orange { background: #fff8ef; }
.next-action-card--green { background: #f3fcf6; }
</style>
