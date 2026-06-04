<template>
  <div class="payment-list page-container">
    <!-- Page Header -->
    <div class="page-header animate-fade-in-up">
      <div>
        <h2 class="page-title">付款管理</h2>
      </div>
    </div>

    <!-- Summary Stat Cards -->
    <a-row :gutter="[16, 16]" class="summary-row animate-stagger">
      <a-col :xs="12" :sm="6">
        <div class="stat-card stat-card--pending">
          <div class="stat-card__icon" style="background: rgba(245,158,11,0.1)">
            <ClockCircleOutlined style="color: #f59e0b; font-size: 20px" />
          </div>
          <div class="stat-card__label">待付款</div>
          <div class="stat-card__value number-animate" style="color: var(--warning)">
            {{ pendingCount }}
            <span class="stat-card__unit">笔</span>
          </div>
          <div class="stat-card__footer">
            <span class="stat-card__amount">¥ {{ formatAmount(pendingAmount) }}</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="6">
        <div class="stat-card stat-card--paid">
          <div class="stat-card__icon" style="background: rgba(34,197,94,0.1)">
            <CheckCircleOutlined style="color: var(--success); font-size: 20px" />
          </div>
          <div class="stat-card__label">已付款</div>
          <div class="stat-card__value number-animate" style="color: var(--success)">
            {{ paidCount }}
            <span class="stat-card__unit">笔</span>
          </div>
          <div class="stat-card__footer">
            <span class="stat-card__amount">¥ {{ formatAmount(paidAmount) }}</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="6">
        <div class="stat-card stat-card--failed">
          <div class="stat-card__icon" style="background: rgba(239,68,68,0.1)">
            <CloseCircleOutlined style="color: var(--error); font-size: 20px" />
          </div>
          <div class="stat-card__label">付款失败</div>
          <div class="stat-card__value number-animate" style="color: var(--error)">
            {{ failedCount }}
            <span class="stat-card__unit">笔</span>
          </div>
          <div class="stat-card__footer">
            <span class="stat-card__amount">¥ {{ formatAmount(failedAmount) }}</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="6">
        <div class="stat-card stat-card--refund">
          <div class="stat-card__icon" style="background: rgba(79,110,247,0.1)">
            <RollbackOutlined style="color: var(--primary); font-size: 20px" />
          </div>
          <div class="stat-card__label">已退款</div>
          <div class="stat-card__value number-animate" style="color: var(--primary)">
            {{ refundedCount }}
            <span class="stat-card__unit">笔</span>
          </div>
          <div class="stat-card__footer">
            <span class="stat-card__amount">¥ {{ formatAmount(refundedAmount) }}</span>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- Filter Bar -->
    <a-card class="filter-card animate-fade-in-up" style="animation-delay: 0.1s">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="6" :md="5">
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            allow-clear
            style="width: 100%"
          >
            <a-select-option :value="0">待付款</a-select-option>
            <a-select-option :value="1">已付款</a-select-option>
            <a-select-option :value="2">付款失败</a-select-option>
            <a-select-option :value="3">已退款</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="10" :md="8">
          <a-range-picker
            v-model:value="dateRange"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 100%"
            @change="handleDateChange"
          />
        </a-col>
        <a-col :xs="24" :sm="8" :md="6">
          <a-input-search
            v-model:value="query.keyword"
            placeholder="付款单 / 报销单 / 事由 / 收款人"
            allow-clear
            @search="handleSearch"
            @press-enter="handleSearch"
          />
        </a-col>
        <a-col>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              查询
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card class="table-card animate-fade-in-up" style="animation-delay: 0.15s">
      <!-- Batch Action Banner -->
      <transition name="slide-down-fade">
        <div v-if="selectedRowKeys.length > 0" class="batch-action-bar">
          <div class="batch-action-info">
            <span class="info-icon">💡</span>
            <span>已选择 <strong class="info-count">{{ selectedRowKeys.length }}</strong> 笔付款记录，总计金额：<strong class="info-amount">¥ {{ formatAmount(selectedAmount) }}</strong></span>
          </div>
          <div class="batch-action-btns">
            <a-button type="primary" class="batch-export-btn" @click="handleBatchExport">
              <template #icon><DownloadOutlined /></template>
              批量导出打款单
            </a-button>
            <a-button class="batch-cancel-btn" @click="clearSelection">
              取消选择
            </a-button>
          </div>
        </div>
      </transition>

      <a-table
        :data-source="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 1300 }"
        :row-selection="rowSelection"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'paymentAmount'">
            <span class="amount-cell">¥{{ formatAmount(record.paymentAmount) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'paymentMethod'">
            {{ record.paymentMethodLabel || methodLabelMap[record.paymentMethod] || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <span :class="['status-tag', statusTagClassMap[record.status]]">
              {{ record.statusLabel || statusLabelMap[record.status] || '-' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'paymentAt'">
            <span :class="record.paymentAt ? 'time-cell' : 'text-muted'">
              {{ record.paymentAt || '-' }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <div class="table-actions">
              <a-button
                v-if="record.status === 0"
                type="link"
                size="small"
                class="action-btn action-btn--confirm"
                @click="openConfirmModal(record as PaymentRecord)"
              >
                <template #icon><CheckOutlined /></template>
                确认付款
              </a-button>
              <a-button
                v-if="record.status === 0"
                type="link"
                size="small"
                class="action-btn action-btn--fail"
                @click="handleMarkFailed(record as PaymentRecord)"
              >
                <template #icon><CloseOutlined /></template>
                标记失败
              </a-button>
              <a-button
                v-if="record.status === 1"
                type="link"
                size="small"
                class="action-btn action-btn--refund"
                @click="handleRefund(record as PaymentRecord)"
              >
                <template #icon><RollbackOutlined /></template>
                退款
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Confirm Payment Modal -->
    <a-modal
      v-model:open="confirmModalVisible"
      title="确认付款"
      :confirm-loading="confirmLoading"
      width="560px"
      ok-text="确认付款"
      cancel-text="取消"
      @ok="handleConfirmSubmit"
      @cancel="closeConfirmModal"
    >
      <a-form
        ref="confirmFormRef"
        :model="confirmForm"
        :rules="(confirmRules as any)"
        layout="vertical"
        style="margin-top: 8px"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="付款方式" name="paymentMethod">
              <a-select
                v-model:value="confirmForm.paymentMethod"
                placeholder="付款方式"
                style="width: 100%"
              >
                <a-select-option :value="1">银行转账</a-select-option>
                <a-select-option :value="2">支付宝</a-select-option>
                <a-select-option :value="3">微信支付</a-select-option>
                <a-select-option :value="4">现金</a-select-option>
                <a-select-option :value="5">支票</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="付款银行" name="paymentBank">
              <a-input
                v-model:value="confirmForm.paymentBank"
                placeholder="付款银行"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="付款账号" name="paymentAccount">
              <a-input
                v-model:value="confirmForm.paymentAccount"
                placeholder="付款账号"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="交易流水号" name="transactionNo">
              <a-input
                v-model:value="confirmForm.transactionNo"
                placeholder="交易流水号"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="凭证编号" name="voucherNo">
              <a-input
                v-model:value="confirmForm.voucherNo"
                placeholder="凭证编号"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" name="remark">
              <a-textarea
                v-model:value="confirmForm.remark"
                placeholder="备注"
                :rows="3"
                :maxlength="200"
                show-count
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Mark Failed Modal -->
    <a-modal
      v-model:open="failedModalVisible"
      title="标记付款失败"
      :confirm-loading="failedLoading"
      width="460px"
      ok-text="确认"
      ok-type="danger"
      cancel-text="取消"
      @ok="handleFailedSubmit"
      @cancel="closeFailedModal"
    >
      <div style="margin-top: 8px">
        <div class="modal-alert modal-alert--warning">
          标记付款单 <strong>{{ failedTarget?.paymentNo }}</strong> 为失败？
        </div>
        <a-form layout="vertical" style="margin-top: 16px">
          <a-form-item label="失败原因">
            <a-textarea
              v-model:value="failedRemark"
              placeholder="失败原因"
              :rows="3"
              :maxlength="200"
              show-count
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- Refund Modal -->
    <a-modal
      v-model:open="refundModalVisible"
      title="发起退款"
      :confirm-loading="refundLoading"
      width="460px"
      ok-text="确认退款"
      ok-type="danger"
      cancel-text="取消"
      @ok="handleRefundSubmit"
      @cancel="closeRefundModal"
    >
      <div style="margin-top: 8px">
        <div class="modal-alert modal-alert--danger">
          退款 <strong>{{ refundTarget?.paymentNo }}</strong>
          <span class="amount-cell">¥{{ formatAmount(refundTarget?.paymentAmount) }}</span>？
        </div>
        <a-form layout="vertical" style="margin-top: 16px">
          <a-form-item label="退款原因">
            <a-textarea
              v-model:value="refundRemark"
              placeholder="退款原因"
              :rows="3"
              :maxlength="200"
              show-count
            />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import {
  confirmPayment,
  failPayment,
  fetchPaymentList,
  fetchPaymentSummary,
  refundPayment,
  type PaymentRecord,
} from '@/api/payment'
import dayjs from 'dayjs'

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const statusLabelMap: Record<number, string> = {
  0: '待付款',
  1: '已付款',
  2: '付款失败',
  3: '已退款',
}

const statusTagClassMap: Record<number, string> = {
  0: 'status-tag--pending',
  1: 'status-tag--approved',
  2: 'status-tag--rejected',
  3: 'status-tag--paid',
}

const methodLabelMap: Record<number, string> = {
  1: '银行转账',
  2: '支付宝',
  3: '微信支付',
  4: '现金',
  5: '支票',
}

// ─── Summary counters (accurate totals via dedicated API calls) ───────────────

const pendingCount = ref(0)
const pendingAmount = ref(0)
const paidCount = ref(0)
const paidAmount = ref(0)
const failedCount = ref(0)
const failedAmount = ref(0)
const refundedCount = ref(0)
const refundedAmount = ref(0)

// ─── Table columns ────────────────────────────────────────────────────────────

const columns = [
  { title: '付款单号', dataIndex: 'paymentNo', width: 160, ellipsis: true },
  { title: '报销事由', dataIndex: 'reimbursementTitle', width: 180, ellipsis: true },
  { title: '付款金额', dataIndex: 'paymentAmount', width: 120, align: 'right' as const },
  { title: '收款人', dataIndex: 'payeeName', width: 100 },
  { title: '付款方式', dataIndex: 'paymentMethod', width: 110 },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' as const },
  { title: '付款时间', dataIndex: 'paymentAt', width: 160 },
  { title: '操作', dataIndex: 'action', width: 180, fixed: 'right' as const },
]

// ─── Query & Pagination ───────────────────────────────────────────────────────

const query = reactive({
  status: undefined as number | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  keyword: '',
})

const dateRange = ref<any>(null)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// ─── Table data ───────────────────────────────────────────────────────────────

const selectedRowKeys = ref<(string | number)[]>([])
const selectedRows = ref<PaymentRecord[]>([])

const selectedAmount = computed(() => {
  return selectedRows.value.reduce((sum, item) => sum + (item.paymentAmount ?? 0), 0)
})

const rowSelection = computed(() => {
  return {
    selectedRowKeys: selectedRowKeys.value,
    onChange: (keys: (string | number)[], rows: PaymentRecord[]) => {
      selectedRowKeys.value = keys
      selectedRows.value = rows
    },
  }
})

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function handleBatchExport() {
  if (selectedRows.value.length === 0) {
    message.warning('请先勾选需要导出的付款记录')
    return
  }

  // Create CSV header CNAPS-compliant
  const headers = ['收款人姓名', '收款人账号', '收款人开户行', '打款金额(元)', '付款单号', '报销单号', '打款附言']
  
  // Format each row
  const csvRows = selectedRows.value.map(row => {
    const payeeName = row.payeeName || ''
    const payeeBankAccount = row.payeeBankAccount || ''
    const payeeBankName = row.payeeBankName || ''
    const paymentAmount = row.paymentAmount ?? 0
    const paymentNo = row.paymentNo || ''
    const reimbNo = row.reimbNo || ''
    const memo = `示例地区智能报销打款 - 付款单号:${paymentNo}`

    const formatField = (field: any) => {
      const str = String(field).replace(/"/g, '""')
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }

    return [
      formatField(payeeName),
      formatField(payeeBankAccount),
      formatField(payeeBankName),
      paymentAmount.toFixed(2),
      formatField(paymentNo),
      formatField(reimbNo),
      formatField(memo)
    ].join(',')
  })

  // Prepend UTF-8 BOM to prevent Chinese character corruption in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  
  const timestamp = dayjs().format('YYYYMMDDHHmmss')
  link.setAttribute('download', `示例地区银行打款单_${timestamp}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  message.success(`成功导出 ${selectedRows.value.length} 笔银行打款记录！`)
}

const loading = ref(false)
const tableData = ref<PaymentRecord[]>([])

async function fetchData() {
  loading.value = true
  try {
    const res = await fetchPaymentList({
      page: pagination.current,
      pageSize: pagination.pageSize,
      status: query.status,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      keyword: query.keyword || undefined,
    })
    tableData.value = res.list || []
    pagination.total = res.total || 0
    clearSelection()
  } catch {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

async function fetchSummary() {
  try {
    const summary = await fetchPaymentSummary({
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      keyword: query.keyword || undefined,
    })
    pendingCount.value = summary?.pendingCount || 0
    pendingAmount.value = summary?.pendingAmount || 0
    paidCount.value = summary?.paidCount || 0
    paidAmount.value = summary?.paidAmount || 0
    failedCount.value = summary?.failedCount || 0
    failedAmount.value = summary?.failedAmount || 0
    refundedCount.value = summary?.refundedCount || 0
    refundedAmount.value = summary?.refundedAmount || 0
  } catch {}
}

function handleSearch() {
  pagination.current = 1
  fetchData()
  fetchSummary()
}

function handleReset() {
  query.status = undefined
  query.startDate = undefined
  query.endDate = undefined
  query.keyword = ''
  dateRange.value = null
  pagination.current = 1
  fetchData()
  fetchSummary()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

function handleDateChange(_: any, dateStrings: [string, string]) {
  query.startDate = dateStrings[0] || undefined
  query.endDate = dateStrings[1] || undefined
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: number | null | undefined) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Confirm Payment Modal ────────────────────────────────────────────────────

const confirmModalVisible = ref(false)
const confirmLoading = ref(false)
const confirmTarget = ref<PaymentRecord | null>(null)
const confirmFormRef = ref<FormInstance>()

const confirmForm = reactive({
  paymentMethod: undefined as number | undefined,
  paymentBank: '',
  paymentAccount: '',
  transactionNo: '',
  voucherNo: '',
  remark: '',
})

const confirmRules = {
  paymentMethod: [{ required: true, message: '请选择付款方式', trigger: 'change' }],
  transactionNo: [{ required: true, message: '请输入交易流水号', trigger: 'blur' }],
}

function openConfirmModal(record: PaymentRecord) {
  confirmTarget.value = record
  confirmForm.paymentMethod = undefined
  confirmForm.paymentBank = ''
  confirmForm.paymentAccount = ''
  confirmForm.transactionNo = ''
  confirmForm.voucherNo = ''
  confirmForm.remark = ''
  confirmFormRef.value?.clearValidate()
  confirmModalVisible.value = true
}

function closeConfirmModal() {
  confirmModalVisible.value = false
  confirmTarget.value = null
}

async function handleConfirmSubmit() {
  try {
    await confirmFormRef.value?.validate()
  } catch {
    return
  }
  confirmLoading.value = true
  try {
    await confirmPayment(confirmTarget.value!.id, {
      paymentMethod: confirmForm.paymentMethod!,
      paymentBank: confirmForm.paymentBank || undefined,
      paymentAccount: confirmForm.paymentAccount || undefined,
      transactionNo: confirmForm.transactionNo,
      voucherNo: confirmForm.voucherNo || undefined,
      remark: confirmForm.remark || undefined,
    })
    message.success('付款已确认')
    confirmModalVisible.value = false
    confirmTarget.value = null
    fetchData()
    fetchSummary()
  } catch {
    // error handled by interceptor
  } finally {
    confirmLoading.value = false
  }
}

// ─── Mark Failed Modal ────────────────────────────────────────────────────────

const failedModalVisible = ref(false)
const failedLoading = ref(false)
const failedTarget = ref<PaymentRecord | null>(null)
const failedRemark = ref('')

function handleMarkFailed(record: PaymentRecord) {
  failedTarget.value = record
  failedRemark.value = ''
  failedModalVisible.value = true
}

function closeFailedModal() {
  failedModalVisible.value = false
  failedTarget.value = null
}

async function handleFailedSubmit() {
  failedLoading.value = true
  try {
    await failPayment(failedTarget.value!.id, { remark: failedRemark.value || undefined })
    message.success('已标记为付款失败')
    failedModalVisible.value = false
    failedTarget.value = null
    fetchData()
    fetchSummary()
  } catch {
    // error handled by interceptor
  } finally {
    failedLoading.value = false
  }
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────

const refundModalVisible = ref(false)
const refundLoading = ref(false)
const refundTarget = ref<PaymentRecord | null>(null)
const refundRemark = ref('')

function handleRefund(record: PaymentRecord) {
  refundTarget.value = record
  refundRemark.value = ''
  refundModalVisible.value = true
}

function closeRefundModal() {
  refundModalVisible.value = false
  refundTarget.value = null
}

async function handleRefundSubmit() {
  refundLoading.value = true
  try {
    await refundPayment(refundTarget.value!.id, { remark: refundRemark.value || undefined })
    message.success('退款已发起')
    refundModalVisible.value = false
    refundTarget.value = null
    fetchData()
    fetchSummary()
  } catch {
    // error handled by interceptor
  } finally {
    refundLoading.value = false
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(() => {
  fetchData()
  fetchSummary()
})
</script>

<style scoped lang="less">
.payment-list {
  padding-bottom: 32px;
}

/* ── Summary row ── */
.summary-row {
  margin-bottom: 20px;
}

.stat-card {
  background: var(--bg-container);
  border-radius: var(--r-lg);
  padding: 20px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
  cursor: default;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 0 0 var(--r-lg) var(--r-lg);
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);

    &::after {
      opacity: 1;
    }
  }

  &--pending::after { background: var(--warning); }
  &--paid::after    { background: var(--success); }
  &--failed::after  { background: var(--error); }
  &--refund::after  { background: var(--primary); }
}

.stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sp-3);
}

.stat-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.stat-card__unit {
  font-size: 14px;
  font-weight: 500;
  margin-left: 2px;
  opacity: 0.7;
}

.stat-card__footer {
  margin-top: 8px;
}

.stat-card__amount {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ── Filter card ── */
.filter-card {
  margin-bottom: 16px;

  :deep(.ant-card-body) {
    padding: 16px 20px !important;
  }
}

/* ── Table card ── */
.table-card {
  :deep(.ant-card-body) {
    padding: 0 !important;
  }

  :deep(.ant-table-thead > tr > th) {
    background: var(--bg-page) !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    color: var(--text-tertiary) !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--primary-bg) !important;
  }

  :deep(.ant-pagination) {
    padding: 16px 20px;
  }
}

/* ── Amount cell ── */
.amount-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: -0.01em;
}

/* ── Time cell ── */
.time-cell {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ── Action buttons ── */
.action-btn {
  font-size: 13px;
  font-weight: 500;
  padding: 3px 8px !important;
  height: auto !important;
  border-radius: var(--r-sm) !important;
  transition: all var(--duration-fast) var(--ease-out) !important;

  &--confirm {
    color: var(--success) !important;

    &:hover {
      background: var(--success-bg) !important;
      color: var(--success) !important;
    }
  }

  &--fail {
    color: var(--error) !important;

    &:hover {
      background: var(--error-bg) !important;
      color: var(--error) !important;
    }
  }

  &--refund {
    color: var(--primary) !important;

    &:hover {
      background: var(--primary-bg) !important;
      color: var(--primary) !important;
    }
  }
}

/* ── Modal alerts ── */
.modal-alert {
  padding: 12px 16px;
  border-radius: var(--r-md);
  font-size: 14px;
  line-height: 1.6;

  &--warning {
    background: var(--warning-bg);
    border: 1px solid rgba(245, 158, 11, 0.2);
    color: var(--text-primary);
  }

  &--danger {
    background: var(--error-bg);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--text-primary);
  }

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }
}

.text-muted {
  color: var(--text-quaternary);
}

/* ── Batch Action Bar ── */
.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(79, 110, 247, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(79, 110, 247, 0.2);
  border-radius: var(--r-xl);
  padding: 14px 20px;
  margin: 16px 20px 0 20px;
  
  .batch-action-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: var(--text-primary);

    .info-icon {
      font-size: 16px;
    }

    .info-count {
      color: var(--primary);
      font-size: 15px;
      font-weight: 700;
    }

    .info-amount {
      color: #ea580c;
      font-size: 15px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  }

  .batch-action-btns {
    display: flex;
    align-items: center;
    gap: 10px;

    .batch-export-btn {
      background: var(--primary-gradient) !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(79, 110, 247, 0.25) !important;
      font-weight: 600 !important;
      border-radius: var(--r-lg) !important;
      height: 36px !important;
      color: #fff !important;
      
      &:hover {
        box-shadow: 0 6px 16px rgba(79, 110, 247, 0.35) !important;
      }
    }

    .batch-cancel-btn {
      border-radius: var(--r-lg) !important;
      height: 36px !important;
      font-weight: 500 !important;
    }
  }
}

/* ── Transitions ── */
.slide-down-fade-enter-active,
.slide-down-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-down-fade-enter-from,
.slide-down-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
