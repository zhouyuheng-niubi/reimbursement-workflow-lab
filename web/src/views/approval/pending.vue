<template>
  <div class="approval-pending animate-fade-in-up">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__info">
        <div class="page-header__icon">
          <CheckCircleOutlined />
        </div>
        <div>
          <h2 class="page-title">待我审批</h2>
        </div>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stats-row animate-stagger">
      <div class="stat-card">
        <div class="stat-card__icon" style="background: rgba(245,158,11,0.1); color: var(--warning)">
          <ClockCircleOutlined />
        </div>
        <div class="stat-card__label">待审批</div>
        <div class="stat-card__value">{{ pagination.total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: rgba(239,68,68,0.1); color: var(--error)">
          <ExclamationCircleOutlined />
        </div>
        <div class="stat-card__label">紧急</div>
        <div class="stat-card__value">{{ pendingData.filter(r => r.waitingDays > 3).length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: rgba(34,197,94,0.1); color: var(--success)">
          <CheckCircleOutlined />
        </div>
        <div class="stat-card__label">历史通过</div>
        <div class="stat-card__value">{{ historyData.filter(r => r.action === 1).length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon" style="background: rgba(79,110,247,0.1); color: var(--primary)">
          <HistoryOutlined />
        </div>
        <div class="stat-card__label">审批历史</div>
        <div class="stat-card__value">{{ historyPagination.total }}</div>
      </div>
    </div>

    <!-- Split Layout -->
    <div class="split-container" :class="{ 'has-selection': !!selectedId }">
      
      <!-- Left: List -->
      <div class="split-left">
        <!-- Filter -->
        <div class="filter-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="8" :md="6">
          <a-input
            v-model:value="query.keyword"
            placeholder="单号 / 标题 / 申请人"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined style="color: var(--text-tertiary)" /></template>
          </a-input>
        </a-col>
        <a-col>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- Tabs -->
    <div class="content-card">
      <a-tabs v-model:activeKey="activeTab" @change="handleTabChange" class="pending-tabs">

        <!-- ── Pending Tab ── -->
        <a-tab-pane key="pending">
          <template #tab>
            <span class="tab-label">
              <ClockCircleOutlined />
              待我审批
              <span v-if="pagination.total > 0" class="tab-badge">{{ pagination.total }}</span>
            </span>
          </template>

          <a-spin :spinning="loading">
            <!-- Empty state -->
            <div v-if="pendingData.length === 0 && !loading" class="empty-state">
              <div class="empty-state__art">
                <div class="empty-art-circle empty-art-circle--outer"></div>
                <div class="empty-art-circle empty-art-circle--inner"></div>
                <div class="empty-art-icon"><CheckCircleOutlined /></div>
              </div>
              <p class="empty-state__title">暂无待审批单据</p>
            </div>

            <!-- Pending Cards -->
            <div v-else class="pending-list">
              <div
                v-for="record in pendingData"
                :key="record.reimbursementId"
                class="pending-card"
                :class="{
                  'pending-card--urgent': record.waitingDays > 3,
                  'pending-card--warn': record.waitingDays > 1 && record.waitingDays <= 3
                }"
              >
                <!-- Left status bar -->
                <div
                  class="pending-card__bar"
                  :style="{
                    background: record.waitingDays > 3
                      ? 'var(--error)'
                      : record.waitingDays > 1
                        ? 'var(--warning)'
                        : 'var(--primary)'
                  }"
                ></div>

                <div class="pending-card__body">
                  <!-- Row 1: No + Title + Amount -->
                  <div class="pending-card__top">
                    <div class="pending-card__title-group">
                      <a class="pending-card__no" @click="goDetail(record.reimbursementId)">
                        {{ record.reimbNo }}
                      </a>
                      <span class="pending-card__title" :title="record.title">{{ record.title }}</span>
                    </div>
                    <div class="pending-card__amount">
                      <span class="amount-label">金额</span>
                      <span class="amount-value">¥{{ formatAmount(record.totalAmount) }}</span>
                    </div>
                  </div>

                  <!-- Row 2: Meta chips -->
                  <div class="pending-card__meta">
                    <span class="meta-chip">
                      <UserOutlined />
                      {{ record.applicantName }}
                    </span>
                    <span class="meta-chip">
                      <ApartmentOutlined />
                      {{ record.departmentName }}
                    </span>
                    <span class="meta-chip">
                      <TagOutlined />
                      {{ record.typeName }}
                    </span>
                    <span class="meta-chip">
                      <CalendarOutlined />
                      {{ record.submitAt ? dayjs(record.submitAt).format('MM-DD HH:mm') : '—' }}
                    </span>
                    <span
                      class="meta-chip meta-chip--waiting"
                      :class="{
                        'meta-chip--urgent': record.waitingDays > 3,
                        'meta-chip--warn': record.waitingDays > 1 && record.waitingDays <= 3
                      }"
                    >
                      <ClockCircleOutlined />
                      等待 {{ record.waitingDays }} 天
                    </span>
                  </div>

                  <!-- Row 3: Progress + Actions -->
                  <div class="pending-card__bottom">
                    <div class="pending-card__progress">
                      <div class="progress-info">
                        <span class="progress-label">{{ record.currentNodeName }}</span>
                        <span class="progress-steps">{{ record.currentNodeOrder }}/{{ record.totalNodes }}</span>
                      </div>
                      <a-progress
                        :percent="Math.round(((record.currentNodeOrder || 1) / (record.totalNodes || 1)) * 100)"
                        :show-info="false"
                        :stroke-color="'var(--primary)'"
                        :trail-color="'var(--border-light)'"
                        size="small"
                        style="margin-top: 4px"
                      />
                    </div>

                    <div class="pending-card__actions">
                      <a-button
                        type="link"
                        size="small"
                        class="btn-detail"
                        @click="goDetail(record.reimbursementId)"
                      >
                        <EyeOutlined /> 详情
                      </a-button>
                      <a-button
                        class="btn-approve"
                        size="small"
                        @click="quickApprove(record)"
                      >
                        <CheckCircleOutlined /> 通过
                      </a-button>
                      <a-button
                        class="btn-reject"
                        size="small"
                        @click="quickReject(record)"
                      >
                        <CloseCircleOutlined /> 驳回
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="pendingData.length > 0" class="pagination-wrap">
              <a-pagination
                v-model:current="pagination.current"
                v-model:page-size="pagination.pageSize"
                :total="pagination.total"
                :show-size-changer="true"
                :show-quick-jumper="true"
                :show-total="pagination.showTotal"
                @change="(page: number, size: number) => { pagination.current = page; pagination.pageSize = size; fetchPending() }"
              />
            </div>
          </a-spin>
        </a-tab-pane>

        <!-- ── History Tab ── -->
        <a-tab-pane key="history">
          <template #tab>
            <span class="tab-label">
              <HistoryOutlined />
              审批历史
            </span>
          </template>

          <a-spin :spinning="historyLoading">
            <div v-if="historyData.length === 0 && !historyLoading" class="empty-state">
              <div class="empty-state__art">
              <div class="empty-art-circle empty-art-circle--outer"></div>
              <div class="empty-art-circle empty-art-circle--inner"></div>
              <div class="empty-art-icon"><HistoryOutlined /></div>
            </div>
            <p class="empty-state__title">暂无审批历史</p>
          </div>

            <div v-else class="history-list">
              <div v-for="record in historyData" :key="record.id" class="history-card">
                <div class="history-card__action-dot" :class="`history-card__action-dot--${record.action}`"></div>
                <div class="history-card__body">
                  <div class="history-card__top">
                    <span class="history-card__node">{{ record.nodeName }}</span>
                    <span class="history-action-tag" :class="`history-action-tag--${record.action}`">
                      {{ record.actionLabel }}
                    </span>
                    <span class="history-card__time">{{ record.actionAt ? dayjs(record.actionAt).format('YYYY-MM-DD HH:mm') : '—' }}</span>
                    <a-button type="link" size="small" class="btn-detail" @click="goDetail(record.reimbursementId)">
                      查看报销单
                    </a-button>
                  </div>
                  <div v-if="record.opinion" class="history-card__opinion">
                    <MessageOutlined />
                    {{ record.opinion }}
                  </div>
                  <div v-if="record.durationMinutes" class="history-card__duration">
                    <ClockCircleOutlined />
                    耗时 {{ record.durationMinutes }} 分钟
                  </div>
                </div>
              </div>
            </div>

            <div v-if="historyData.length > 0" class="pagination-wrap">
              <a-pagination
                v-model:current="historyPagination.current"
                v-model:page-size="historyPagination.pageSize"
                :total="historyPagination.total"
                :show-size-changer="true"
                :show-total="historyPagination.showTotal"
                @change="(page: number, size: number) => { historyPagination.current = page; historyPagination.pageSize = size; fetchHistory() }"
              />
            </div>
          </a-spin>
        </a-tab-pane>

          </a-tabs>
        </div>
      </div>

      <!-- Right: Detail -->
      <div class="split-right" v-if="selectedId">
        <ReimbursementDetail 
          :id="selectedId" 
          embedded 
          @close="selectedId = null" 
          @refresh="handleDetailRefresh" 
        />
      </div>
    </div>

    <!-- Quick reject modal -->
    <a-modal
      v-model:open="rejectModalVisible"
      title="驳回审批"
      @ok="confirmReject"
      :confirm-loading="rejecting"
      class="reject-modal"
    >
      <div class="reject-modal__body">
        <div class="reject-modal__icon">
          <CloseCircleOutlined />
        </div>
        <a-form-item label="驳回原因" required class="reject-modal__field">
          <a-textarea
            v-model:value="rejectReason"
            :rows="3"
            placeholder="驳回原因"
          />
        </a-form-item>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message, Modal } from 'ant-design-vue'
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  ApartmentOutlined,
  TagOutlined,
  CalendarOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import ReimbursementDetail from '@/views/reimbursement/detail.vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const historyLoading = ref(false)
const pendingData = ref<any[]>([])
const historyData = ref<any[]>([])
const activeTab = ref('pending')
const selectedId = ref<string | number | null>(null)
const rejectModalVisible = ref(false)
const rejecting = ref(false)
const rejectReason = ref('')
const rejectTarget = ref<any>(null)

const query = reactive({ keyword: '' })

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const historyPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})


function formatAmount(val: number | null) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function fetchPending() {
  loading.value = true
  try {
    const res = await request.get<any>('/v1/approvals/pending', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: query.keyword || undefined,
      },
    })
    pendingData.value = res.list || []
    pagination.total = res.total || 0
  } catch {} finally {
    loading.value = false
  }
}

async function fetchHistory() {
  historyLoading.value = true
  try {
    const res = await request.get<any>('/v1/approvals/history', {
      params: { page: historyPagination.current, pageSize: historyPagination.pageSize },
    })
    historyData.value = res.list || []
    historyPagination.total = res.total || 0
  } catch {} finally {
    historyLoading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchPending()
}

function handleReset() {
  query.keyword = ''
  pagination.current = 1
  fetchPending()
}

function handleTabChange(key: string | number) {
  if (key === 'history' && historyData.value.length === 0) {
    fetchHistory()
  }
}

function goDetail(reimbursementId: number) {
  selectedId.value = reimbursementId
}

function handleDetailRefresh() {
  if (activeTab.value === 'pending') fetchPending()
  else fetchHistory()
}

function quickApprove(record: any) {
  Modal.confirm({
    title: '确认通过',
    content: `确定通过报销单「${record.reimbNo}」的审批吗？`,
    okText: '通过',
    onOk: async () => {
      await request.post(`/v1/approvals/${record.reimbursementId}/approve`, {
        action: 1,
        opinion: '同意',
      })
      fetchPending()
      if (userStore.hasAnyRole(['FINANCE', 'ADMIN', 'SUPER_ADMIN'])) {
        Modal.confirm({
          title: '审批已通过',
          content: '已创建付款记录，前往付款管理？',
          okText: '前往付款',
          cancelText: '稍后处理',
          onOk: () => router.push('/payment/list'),
        })
      } else {
        message.success('审批通过，已通知财务处理付款')
      }
    },
  })
}

function quickReject(record: any) {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectModalVisible.value = true
}

async function confirmReject() {
  if (!rejectReason.value) {
    message.warning('请输入驳回原因')
    return
  }
  rejecting.value = true
  try {
    await request.post(`/v1/approvals/${rejectTarget.value.reimbursementId}/approve`, {
      action: 2,
      opinion: rejectReason.value,
    })
    message.success('已驳回')
    rejectModalVisible.value = false
    fetchPending()
  } finally {
    rejecting.value = false
  }
}

onMounted(() => {
  fetchPending()
})
</script>

<style scoped lang="less">
.approval-pending {
  max-width: 1440px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ── Split Layout ── */
.split-container {
  display: flex;
  gap: var(--sp-5);
  flex: 1;
  min-height: 0;
  transition: all 0.3s ease;
}

.split-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: all 0.3s ease;
}

.split-right {
  flex: 2;
  min-width: 0;
  background: var(--bg-container);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease forwards;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.has-selection .split-left {
  flex: 0 0 450px;
}

@media (max-width: 992px) {
  .split-container.has-selection .split-left {
    display: none;
  }
  .split-right {
    flex: 1;
  }
}

/* ── Page Header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
  gap: var(--sp-4);

  &__info {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: var(--r-lg);
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: #fff;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    flex-shrink: 0;
  }
}

/* ── Stats Row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Filter ── */
.filter-card {
  background: var(--bg-container);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 16px 20px;
  margin-bottom: var(--sp-5);
}

.content-card {
  background: var(--bg-container);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 0 24px 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pending-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  :deep(.ant-tabs-nav) {
    margin-bottom: 20px;
  }
  
  :deep(.ant-tabs-content-holder) {
    flex: 1;
    overflow-y: auto;
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--error);
  color: #fff;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

/* ── Pending List ── */
.pending-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* ── Pending Card ── */
.pending-card {
  display: flex;
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  background: var(--bg-container);
  transition: all var(--duration-normal) var(--ease-out);

  &:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateX(2px);
  }

  &--urgent {
    border-color: rgba(239, 68, 68, 0.25);
    background: linear-gradient(to right, rgba(239, 68, 68, 0.02), var(--bg-container));
  }

  &--warn {
    border-color: rgba(245, 158, 11, 0.25);
    background: linear-gradient(to right, rgba(245, 158, 11, 0.02), var(--bg-container));
  }

  &__bar {
    width: 4px;
    flex-shrink: 0;
    border-radius: 0;
  }

  &__body {
    flex: 1;
    padding: 16px 20px;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 12px;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  &__no {
    font-size: 14px;
    font-weight: 700;
    color: var(--primary);
    white-space: nowrap;
    flex-shrink: 0;
    text-decoration: none;
    transition: color var(--duration-fast) var(--ease-out);

    &:hover {
      color: var(--primary-light);
      text-decoration: underline;
    }
  }

  &__title {
    font-size: 14px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__progress {
    flex: 1;
    min-width: 160px;
    max-width: 320px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

/* ── Amount ── */
.pending-card__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.amount-label {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.amount-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

/* ── Meta Chips ── */
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  border-radius: var(--r-full);
  font-size: 12px;
  color: var(--text-secondary);

  &--urgent {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: var(--error);
    font-weight: 600;
  }

  &--warn {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
    color: var(--warning);
    font-weight: 600;
  }
}

/* ── Progress ── */
.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-steps {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* ── Action Buttons ── */
.btn-detail {
  font-size: 12px;
  color: var(--text-secondary) !important;
  padding: 4px 8px !important;
  height: auto !important;
  border-radius: var(--r-md) !important;

  &:hover {
    color: var(--primary) !important;
    background: var(--primary-bg) !important;
  }
}

.btn-approve {
  height: 30px;
  padding: 0 14px;
  border-radius: var(--r-md) !important;
  background: rgba(34, 197, 94, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.25) !important;
  color: #16a34a !important;
  font-size: 13px;
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease-out) !important;

  &:hover {
    background: var(--success) !important;
    border-color: var(--success) !important;
    color: #fff !important;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
  }
}

.btn-reject {
  height: 30px;
  padding: 0 14px;
  border-radius: var(--r-md) !important;
  background: rgba(239, 68, 68, 0.08) !important;
  border-color: rgba(239, 68, 68, 0.2) !important;
  color: var(--error) !important;
  font-size: 13px;
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease-out) !important;

  &:hover {
    background: var(--error) !important;
    border-color: var(--error) !important;
    color: #fff !important;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
  }
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  gap: 12px;

  &__art {
    position: relative;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  &__desc {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
  }
}

.empty-art-circle {
  position: absolute;
  border-radius: 50%;

  &--outer {
    width: 100px;
    height: 100px;
    background: rgba(34, 197, 94, 0.06);
    border: 2px solid rgba(34, 197, 94, 0.12);
  }

  &--inner {
    width: 68px;
    height: 68px;
    background: rgba(34, 197, 94, 0.1);
    border: 2px solid rgba(34, 197, 94, 0.18);
  }
}

.empty-art-icon {
  position: relative;
  z-index: 1;
  font-size: 32px;
  color: var(--success);
}

/* ── History List ── */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.history-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  background: var(--bg-container);
  box-shadow: var(--shadow-xs);
  transition: all var(--duration-fast) var(--ease-out);

  &:hover {
    box-shadow: var(--shadow-sm);
    border-color: rgba(79, 110, 247, 0.15);
  }

  &__action-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;

    &--0 { background: var(--primary); box-shadow: 0 0 0 3px rgba(79,110,247,0.15); }
    &--1 { background: var(--success); box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
    &--2 { background: var(--error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    &--3 { background: var(--warning); box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__node {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__time {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-left: auto;
  }

  &__opinion {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 6px;
    padding: 6px 10px;
    background: var(--bg-page);
    border-radius: var(--r-md);
    border-left: 3px solid var(--border);
  }

  &__duration {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 6px;
  }
}

/* ── History Action Tags ── */
.history-action-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 600;

  &--0 { background: rgba(79,110,247,0.1); color: var(--primary); }
  &--1 { background: rgba(34,197,94,0.1); color: #16a34a; }
  &--2 { background: rgba(239,68,68,0.1); color: var(--error); }
  &--3 { background: rgba(245,158,11,0.1); color: var(--warning); }
}

/* ── Pagination ── */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sp-5);
}

/* ── Reject Modal ── */
.reject-modal__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.reject-modal__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--error);
}

.reject-modal__hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

.reject-modal__field {
  width: 100%;
  margin-bottom: 0 !important;
}
</style>
