<template>
  <div class="reimbursement-list animate-fade-in-up">
    <div class="page-header">
      <div class="page-header__left">
        <div class="page-title-icon">
          <FileTextOutlined />
        </div>
        <div>
          <h2 class="page-title">我的报销</h2>
        </div>
      </div>
      <div class="page-header__actions">
        <a-button type="primary" size="large" class="create-btn" @click="handleCreate">
          <template #icon><PlusOutlined /></template>
          新建报销
        </a-button>
      </div>
    </div>

    <ActionBar
      title="先处理需要你继续推进的单据"
      style="margin-bottom: 20px"
    >
      <a-button @click="router.push('/invoice/ocr')">先拍票识别</a-button>
      <a-button @click="router.push('/invoice/list')">管理发票夹</a-button>
    </ActionBar>

    <a-row :gutter="[16, 16]" class="summary-row">
      <a-col :xs="24" :sm="12" :xl="6">
        <KpiCard label="草稿 / 被驳回" :value="draftLikeCount" meta="优先继续处理这两类单据" tone="orange">
          <template #meta>草稿 {{ draftCount }} · 被驳回 {{ rejectedCount }}</template>
        </KpiCard>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <KpiCard label="审批中" :value="inProgressCount" meta="等待审批流推进中的单据" tone="blue" />
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <KpiCard label="本页金额" :value="summaryAmountLabel" meta="当前筛选结果的页面内金额合计" tone="green" />
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <KpiCard label="全部结果" :value="pagination.total || 0" meta="当前筛选条件下的总记录数" tone="slate" />
      </a-col>
    </a-row>

    <!-- Filter Card -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm" class="filter-form">
        <a-form-item label="关键词" class="filter-item">
          <a-input
            v-model:value="filterForm.keyword"
            placeholder="搜索报销单号 / 标题"
            allow-clear
            class="filter-input"
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined class="input-prefix-icon" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="状态" class="filter-item">
          <a-select
            v-model:value="filterForm.status"
            placeholder="全部状态"
            allow-clear
            class="filter-select"
          >
            <a-select-option v-for="s in statusOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="提交日期" class="filter-item">
          <a-range-picker
            v-model:value="filterForm.dateRange"
            :placeholder="['开始日期', '结束日期']"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="filter-datepicker"
          />
        </a-form-item>

        <a-form-item class="filter-item filter-actions">
          <a-button type="primary" class="btn-search" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button class="btn-reset" @click="handleReset">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Table Card -->
    <a-card class="table-card">
      <!-- Card Header with stats chips -->
      <div class="table-card-header">
        <div class="table-card-title">
          <span class="table-card-title__text">全部申请单</span>
          <span v-if="pagination.total" class="table-card-title__count">{{ pagination.total }}</span>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 1100 }"
        class="reimb-table"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">

          <!-- 报销单号列 -->
          <template v-if="column.key === 'reimbNo'">
            <span class="reimb-no">{{ record.reimbNo }}</span>
          </template>

          <!-- 标题列 -->
          <template v-else-if="column.key === 'title'">
            <span class="cell-title" @click="handleView(record as any)">{{ record.title }}</span>
          </template>

          <!-- 金额列 -->
          <template v-else-if="column.key === 'totalAmount'">
            <AmountDisplay :amount="record.totalAmount" bold />
          </template>

          <!-- 状态列 -->
          <template v-else-if="column.key === 'status'">
            <StatusTag :status="record.status" :label="record.statusLabel" />
          </template>

          <!-- 提交时间列 -->
          <template v-else-if="column.key === 'submitAt'">
            <span class="date-cell">
              {{ record.submitAt ? dayjs(record.submitAt).format('YYYY-MM-DD HH:mm') : '—' }}
            </span>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <div class="table-actions">
              <!-- 查看 -->
              <a-tooltip title="查看详情">
                <a-button type="link" size="small" class="action-btn action-btn--view" @click="handleView(record as any)">
                  <template #icon><EyeOutlined /></template>
                  查看
                </a-button>
              </a-tooltip>

              <!-- 编辑：草稿或驳回 -->
              <a-tooltip v-if="canEdit(record.status)" title="编辑报销单">
                <a-button type="link" size="small" class="action-btn action-btn--edit" @click="handleEdit(record as any)">
                  <template #icon><EditOutlined /></template>
                  编辑
                </a-button>
              </a-tooltip>

              <!-- 提交：仅草稿 -->
              <a-popconfirm
                v-if="record.status === 0"
                title="确认提交此报销单进行审批？"
                ok-text="确认提交"
                cancel-text="取消"
                placement="topRight"
                @confirm="handleSubmit(record as any)"
              >
                <a-button type="link" size="small" class="action-btn action-btn--submit" :loading="record._submitting">
                  <template #icon><SendOutlined /></template>
                  提交
                </a-button>
              </a-popconfirm>

              <!-- 撤回：仅待审批 -->
              <a-popconfirm
                v-if="record.status === 1"
                title="确认撤回此报销单？"
                ok-text="确认撤回"
                cancel-text="取消"
                placement="topRight"
                @confirm="handleWithdraw(record as any)"
              >
                <a-button type="link" size="small" class="action-btn action-btn--danger" danger :loading="record._withdrawing">
                  <template #icon><RollbackOutlined /></template>
                  撤回
                </a-button>
              </a-popconfirm>

              <!-- 删除：仅草稿 -->
              <a-popconfirm
                v-if="record.status === 0"
                title="确认删除此报销单？此操作不可恢复。"
                ok-text="删除"
                cancel-text="取消"
                ok-type="danger"
                placement="topRight"
                @confirm="handleDelete(record as any)"
              >
                <a-button type="link" size="small" class="action-btn action-btn--danger" danger :loading="record._deleting">
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </a-popconfirm>
            </div>
          </template>

        </template>

        <!-- 空状态 -->
        <template #emptyText>
          <EmptyState
            title="当前筛选条件下没有报销记录"
          >
            <template #icon><FileSearchOutlined /></template>
            <template #action>
              <a-button type="primary" size="small" @click="handleCreate">
                <template #icon><PlusOutlined /></template>
                新建报销单
              </a-button>
            </template>
          </EmptyState>
        </template>
      </a-table>
    </a-card>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import dayjs from 'dayjs'
import request from '@/utils/request'
import ActionBar from '@/components/ActionBar.vue'
import AmountDisplay from '@/components/AmountDisplay.vue'
import EmptyState from '@/components/EmptyState.vue'
import KpiCard from '@/components/KpiCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  SendOutlined,
  RollbackOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons-vue'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReimbursementListVO {
  id: number
  reimbNo: string
  title: string
  typeName: string
  applicantName: string
  departmentName: string
  projectName: string
  totalAmount: number
  status: number
  statusLabel: string
  submitAt: string | null
  createdAt: string
  // local loading flags
  _submitting?: boolean
  _withdrawing?: boolean
  _deleting?: boolean
}

interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

interface FilterForm {
  keyword: string
  status: number | undefined
  dateRange: any
}

// ─── Constants ───────────────────────────────────────────────────────────────


const STATUS_LABEL_MAP: Record<number, string> = {
  0: '草稿',
  1: '待审批',
  2: '审批中',
  3: '已通过',
  4: '已驳回',
  5: '已撤回',
  6: '已付款',
  7: '已关闭',
}

const statusOptions = Object.entries(STATUS_LABEL_MAP).map(([value, label]) => ({
  value: Number(value),
  label,
}))

// ─── Table Columns ───────────────────────────────────────────────────────────

const columns = [
  {
    title: '报销单号',
    dataIndex: 'reimbNo',
    key: 'reimbNo',
    width: 160,
    ellipsis: true,
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    width: 200,
    ellipsis: true,
  },
  {
    title: '类型',
    dataIndex: 'typeName',
    key: 'typeName',
    width: 100,
    ellipsis: true,
  },
  {
    title: '申请人',
    dataIndex: 'applicantName',
    key: 'applicantName',
    width: 90,
  },
  {
    title: '部门',
    dataIndex: 'departmentName',
    key: 'departmentName',
    width: 120,
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 130,
    align: 'right' as const,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 96,
    align: 'center' as const,
  },
  {
    title: '提交时间',
    dataIndex: 'submitAt',
    key: 'submitAt',
    width: 140,
  },
  {
    title: '操作',
    key: 'action',
    width: 220,
    fixed: 'right' as const,
  },
]

// ─── State ───────────────────────────────────────────────────────────────────

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const tableData = ref<ReimbursementListVO[]>([])

const filterForm = reactive<FilterForm>({
  keyword: '',
  status: undefined,
  dateRange: null,
})

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (total: number) => `共 ${total} 条`,
})

const draftCount = computed(() => tableData.value.filter(item => item.status === 0).length)
const rejectedCount = computed(() => tableData.value.filter(item => item.status === 4).length)
const draftLikeCount = computed(() => draftCount.value + rejectedCount.value)
const inProgressCount = computed(() => tableData.value.filter(item => item.status === 2 || item.status === 1).length)
const summaryAmountLabel = computed(() => `¥${formatAmount(tableData.value.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))}`)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount == null) return '0.00'
  return Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function canEdit(status: number): boolean {
  return status === 0 || status === 4
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.status !== undefined && filterForm.status !== null) {
      params.status = filterForm.status
    }
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    const result = await request.get<PageResult<ReimbursementListVO>>('/v1/reimbursements', {
      params,
    })

    tableData.value = result.list.map((item) => ({
      ...item,
      _submitting: false,
      _withdrawing: false,
      _deleting: false,
    }))
    pagination.total = result.total
    pagination.current = result.page
  } catch {
    // error already handled by interceptor
  } finally {
    loading.value = false
  }
}

// ─── Filter Actions ───────────────────────────────────────────────────────────

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.status = undefined
  filterForm.dateRange = null
  pagination.current = 1
  fetchList()
}

// ─── Table Pagination & Sort ─────────────────────────────────────────────────

function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 10
  fetchList()
}

// ─── Navigation Actions ───────────────────────────────────────────────────────

function handleCreate() {
  router.push('/reimbursement/create')
}

function handleView(record: ReimbursementListVO) {
  router.push(`/reimbursement/${record.id}`)
}

function handleEdit(record: ReimbursementListVO) {
  router.push(`/reimbursement/create?id=${record.id}`)
}

// ─── CRUD Actions ─────────────────────────────────────────────────────────────

async function handleSubmit(record: ReimbursementListVO) {
  record._submitting = true
  try {
    await request.post(`/v1/reimbursements/${record.id}/submit`)
    message.success('提交成功，已进入审批流程')
    fetchList()
  } catch {
    // error handled by interceptor
  } finally {
    record._submitting = false
  }
}

async function handleWithdraw(record: ReimbursementListVO) {
  record._withdrawing = true
  try {
    await request.post(`/v1/reimbursements/${record.id}/withdraw`)
    message.success('撤回成功')
    fetchList()
  } catch {
    // error handled by interceptor
  } finally {
    record._withdrawing = false
  }
}

async function handleDelete(record: ReimbursementListVO) {
  record._deleting = true
  try {
    await request.delete(`/v1/reimbursements/${record.id}`)
    message.success('删除成功')
    // If deleting the last item on a page beyond page 1, go back one page
    if (tableData.value.length === 1 && (pagination.current ?? 1) > 1) {
      pagination.current = (pagination.current ?? 1) - 1
    }
    fetchList()
  } catch {
    // error handled by interceptor
  } finally {
    record._deleting = false
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  if (typeof route.query.keyword === 'string') {
    filterForm.keyword = route.query.keyword
  }
  fetchList()
})

watch(
  () => route.query.keyword,
  (keyword) => {
    if (typeof keyword === 'string' && keyword !== filterForm.keyword) {
      filterForm.keyword = keyword
      pagination.current = 1
      fetchList()
    }
  },
)
</script>

<style scoped lang="less">
/* ── Page shell ── */
.reimbursement-list {
  max-width: 1400px;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
  gap: var(--sp-4);

  &__left {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }
}

.page-title-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--r-lg);
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.28);
  flex-shrink: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

.create-btn {
  height: 40px;
  padding: 0 20px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ── Filter card ── */
.filter-card {
  margin-bottom: var(--sp-5) !important;

  :deep(.ant-card-body) {
    padding: 16px 20px 4px !important;
  }
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0;

  :deep(.ant-form-item) {
    margin-bottom: 12px;
    margin-right: 16px;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.filter-input {
  width: 210px;
}

.filter-select {
  width: 140px;
}

.filter-datepicker {
  width: 250px;
}

.input-prefix-icon {
  color: var(--text-tertiary);
  font-size: 13px;
}

.filter-actions {
  :deep(.ant-form-item-control-input-content) {
    display: flex;
    gap: 8px;
  }
}

.btn-search {
  font-weight: 500;
}

.btn-reset {
  font-weight: 500;
}

/* ── Table card ── */
.table-card {
  :deep(.ant-card-body) {
    padding: 0 !important;
  }

  /* Hover lift */
  transition: box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out) !important;

  &:hover {
    box-shadow: var(--shadow-card-hover) !important;
    transform: translateY(-2px);
  }
}

.table-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
  margin-bottom: 4px;
}

.table-card-title {
  display: flex;
  align-items: center;
  gap: 8px;

  &__text {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    background: var(--primary-bg);
    color: var(--primary);
    border-radius: var(--r-full);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

/* ── Table internals ── */
.reimb-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--bg-page) !important;
    font-weight: 600 !important;
    font-size: 11px !important;
    color: var(--text-tertiary) !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--border-light) !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 13px 16px !important;
    border-bottom: 1px solid var(--border-light) !important;
    transition: background var(--duration-fast) var(--ease-out);
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: none !important;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--primary-bg) !important;
  }

  :deep(.ant-pagination) {
    padding: 14px 20px;
    margin: 0 !important;
    border-top: 1px solid var(--border-light);
  }
}

/* ── Cell styles ── */
.reimb-no {
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
  color: var(--text-secondary);
  background: var(--bg-page);
  padding: 2px 7px;
  border-radius: var(--r-sm);
  border: 1px solid var(--border-light);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.cell-title {
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);

  &:hover {
    color: var(--primary);
  }
}

.amount-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  font-variant-numeric: tabular-nums;
}

.amount-symbol {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  margin-right: 1px;
}

.amount-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.date-cell {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Table actions ── */
.table-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

.action-btn {
  padding: 3px 7px !important;
  height: auto !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  border-radius: var(--r-sm) !important;
  transition: all var(--duration-fast) var(--ease-out) !important;
  line-height: 1.5 !important;

  &--view {
    color: var(--primary) !important;
    &:hover { background: var(--primary-bg) !important; }
  }

  &--edit {
    color: var(--text-secondary) !important;
    &:hover { background: var(--bg-hover) !important; color: var(--primary) !important; }
  }

  &--submit {
    color: var(--success) !important;
    &:hover { background: var(--success-bg) !important; }
  }

  &--danger {
    &:hover { background: var(--error-bg) !important; }
  }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  gap: 10px;

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: var(--r-xl);
    background: var(--bg-page);
    border: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--text-quaternary);
    margin-bottom: 4px;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
  }

  &__desc {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0 0 6px;
    text-align: center;
    max-width: 320px;
    line-height: 1.6;
  }
}
</style>
