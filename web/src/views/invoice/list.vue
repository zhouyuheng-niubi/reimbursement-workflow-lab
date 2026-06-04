<template>
  <div class="invoice-list animate-fade-in-up">

    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header__left">
        <div class="page-title-icon">
          <FolderOpenOutlined />
        </div>
        <div>
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>
      </div>
      <div class="page-header__actions">
        <a-button type="primary" size="large" class="upload-btn" @click="handleGoOcr" id="btn-go-upload">
          <template #icon><ScanOutlined /></template>
          上传识别新发票
        </a-button>
        <a-button type="default" size="large" class="export-btn" @click="handleExportCsv" id="btn-export-ledger">
          <template #icon><DownloadOutlined /></template>
          导出台账 (CSV)
        </a-button>
      </div>
    </div>

    <!-- Toggle for Finance/Admin User -->
    <div v-if="userStore.isFinance || userStore.isAdmin" class="view-toggle-bar">
      <a-radio-group v-model:value="queryScope" button-style="solid" @change="handleScopeChange" id="radio-query-scope">
        <a-radio-button value="all">
          <DatabaseOutlined /> 中央发票台账
        </a-radio-button>
        <a-radio-button value="mine">
          <UserOutlined /> 我的发票夹
        </a-radio-button>
      </a-radio-group>
    </div>

    <!-- Filter Card -->
    <a-card class="filter-card border-glass">
      <a-form layout="inline" :model="filterForm" class="filter-form">
        <a-form-item label="关键词" class="filter-item">
          <a-input
            v-model:value="filterForm.keyword"
            placeholder="发票号码/代码/销方名称"
            allow-clear
            class="filter-input"
            @press-enter="handleSearch"
            id="input-filter-keyword"
          >
            <template #prefix>
              <SearchOutlined class="input-prefix-icon" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="发票类型" class="filter-item">
          <a-select
            v-model:value="filterForm.invoiceType"
            placeholder="全部类型"
            allow-clear
            class="filter-select"
            id="select-filter-type"
          >
            <a-select-option v-for="t in typeOptions" :key="t.value" :value="t.value">
              {{ t.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="查验真伪" class="filter-item">
          <a-select
            v-model:value="filterForm.verifyStatus"
            placeholder="全部状态"
            allow-clear
            class="filter-select"
            id="select-filter-verify"
          >
            <a-select-option v-for="v in verifyOptions" :key="v.value" :value="v.value">
              {{ v.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="查重状态" class="filter-item">
          <a-select
            v-model:value="filterForm.isDuplicate"
            placeholder="全部"
            allow-clear
            class="filter-select"
            id="select-filter-duplicate"
          >
            <a-select-option :value="1">重复发票</a-select-option>
            <a-select-option :value="0">唯一发票</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="开票日期" class="filter-item">
          <a-range-picker
            v-model:value="filterForm.dateRange"
            :placeholder="['开始日期', '结束日期']"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            class="filter-datepicker"
            id="picker-filter-date"
          />
        </a-form-item>

        <a-form-item class="filter-item filter-actions">
          <a-button type="primary" class="btn-search" @click="handleSearch" id="btn-filter-search">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button class="btn-reset" @click="handleReset" id="btn-filter-reset">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Table Card -->
    <a-card class="table-card border-glass">
      <div class="table-card-header">
        <div class="table-card-title">
          <span class="table-card-title__text">发票记录</span>
          <span v-if="pagination.total" class="table-card-title__count">{{ pagination.total }}</span>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 1200 }"
        class="invoice-table"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">

          <!-- 缩略图列 -->
          <template v-if="column.key === 'thumbnail'">
            <div class="thumbnail-wrapper" @click="handleOpenPreview(record.imageUrl)">
              <img v-if="record.imageUrl" :src="record.imageUrl" alt="发票" class="thumbnail-img" />
              <div v-else class="thumbnail-placeholder">
                <FileImageOutlined />
              </div>
              <div class="thumbnail-hover-mask">
                <EyeOutlined />
              </div>
            </div>
          </template>

          <!-- 发票信息(类型、代码、号码) -->
          <template v-else-if="column.key === 'invoiceInfo'">
            <div class="invoice-info-cell">
              <div class="invoice-type-tag">
                {{ getInvoiceTypeLabel(record.invoiceType) }}
              </div>
              <div class="invoice-no-code">
                <span class="info-label">号码:</span>
                <span class="info-value font-mono">{{ record.invoiceNo || '—' }}</span>
              </div>
              <div class="invoice-no-code">
                <span class="info-label">代码:</span>
                <span class="info-value font-mono">{{ record.invoiceCode || '—' }}</span>
              </div>
            </div>
          </template>

          <!-- 金额列 -->
          <template v-else-if="column.key === 'amount'">
            <div class="amount-cell-wrapper">
              <div class="amount-with-tax">
                <AmountDisplay :amount="record.amountWithTax" bold />
              </div>
              <div class="amount-sub-info">
                <span>不含税: <AmountDisplay :amount="record.totalAmount" size="small" /></span>
                <span class="tax-tag">税: <AmountDisplay :amount="record.taxAmount" size="small" /></span>
              </div>
            </div>
          </template>

          <!-- 查验真伪列 -->
          <template v-else-if="column.key === 'verifyStatus'">
            <div class="verify-status-cell">
              <span :class="['verify-badge', getVerifyBadgeClass(record.checkResult?.verifyStatus)]">
                <template v-if="record._verifying">
                  <LoadingOutlined class="verifying-spinner" /> 查验中...
                </template>
                <template v-else>
                  <span class="badge-dot"></span>
                  {{ getVerifyStatusLabel(record.checkResult?.verifyStatus) }}
                </template>
              </span>
            </div>
          </template>

          <!-- 查重状态列 -->
          <template v-else-if="column.key === 'isDuplicate'">
            <div class="duplicate-status-cell">
              <template v-if="record.checkResult?.isDuplicate === 1">
                <a-tooltip :title="`该发票号码已在报销单 #${record.checkResult.duplicateReimbNo || '未知'} 中使用`">
                  <span class="duplicate-badge duplicate-badge--error animate-pulse" @click="handleGoReimbursement(record.duplicateReimbId)">
                    <WarningOutlined /> 重复发票
                  </span>
                </a-tooltip>
              </template>
              <template v-else>
                <span class="duplicate-badge duplicate-badge--success">
                  <CheckCircleOutlined /> 唯一发票
                </span>
              </template>
            </div>
          </template>

          <!-- 报销绑定状态列 -->
          <template v-else-if="column.key === 'binding'">
            <div class="binding-status-cell">
              <template v-if="record.reimbursementId">
                <a-button type="link" size="small" class="binding-link" @click="handleGoReimbursement(record.reimbursementId)">
                  <LinkOutlined /> #{{ record.reimbursementNo || record.reimbursementId }}
                </a-button>
              </template>
              <template v-else>
                <span class="binding-tag binding-tag--free">
                  <span class="tag-dot"></span> 可用于报销
                </span>
              </template>
            </div>
          </template>

          <!-- 上传人列 -->
          <template v-else-if="column.key === 'uploader'">
            <div class="uploader-cell">
              <div class="uploader-name">{{ record.createdByName || '—' }}</div>
              <div class="uploader-date">{{ record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') : '—' }}</div>
            </div>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <div class="table-actions">
              <a-button type="link" size="small" class="action-btn action-btn--view" @click="handleViewDetail(record)">
                <template #icon><EyeOutlined /></template>详情
              </a-button>

              <a-button
                v-if="record.checkResult?.verifyStatus !== 2 && record.checkResult?.verifyStatus !== 3"
                type="link"
                size="small"
                class="action-btn action-btn--verify"
                :loading="record._verifying"
                @click="handleVerify(record)"
              >
                <template #icon><FileSyncOutlined /></template>验真
              </a-button>

              <a-button
                v-if="!record.reimbursementId"
                type="link"
                size="small"
                class="action-btn action-btn--danger"
                danger
                :loading="record._deleting"
                @click="handleDelete(record)"
              >
                <template #icon><DeleteOutlined /></template>删除
              </a-button>
              <a-tooltip v-else title="该发票已绑定报销单，不可删除">
                <span class="disabled-action-btn">
                  <DeleteOutlined /> 删除
                </span>
              </a-tooltip>
            </div>
          </template>

        </template>

        <!-- 空状态 -->
        <template #emptyText>
          <div class="empty-state">
            <div class="empty-state__icon">
              <InboxOutlined />
            </div>
            <p class="empty-state__title">暂无发票记录</p>
            <a-button type="primary" size="small" @click="handleGoOcr">
              <template #icon><ScanOutlined /></template>
              立即识别
            </a-button>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- Side Drawer: Structural Line-Item Details -->
    <a-drawer
      v-model:open="drawerVisible"
      title="发票结构化明细"
      width="640"
      placement="right"
      :body-style="{ padding: '24px' }"
      class="invoice-detail-drawer"
    >
      <div v-if="selectedInvoice" class="drawer-content">
        <!-- Core Fields Card -->
        <div class="detail-section border-glass">
          <h3 class="section-title">基本信息</h3>
          <div class="info-grid">
            <div class="grid-item">
              <span class="grid-label">发票类型:</span>
              <span class="grid-value">{{ getInvoiceTypeLabel(selectedInvoice.invoiceType) }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">开票日期:</span>
              <span class="grid-value font-mono">{{ selectedInvoice.invoiceDate || '—' }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">发票号码:</span>
              <span class="grid-value font-mono">{{ selectedInvoice.invoiceNo || '—' }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">发票代码:</span>
              <span class="grid-value font-mono">{{ selectedInvoice.invoiceCode || '—' }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">校验码:</span>
              <span class="grid-value font-mono">{{ selectedInvoice.checkCode || '—' }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">币种:</span>
              <span class="grid-value">{{ selectedInvoice.currency || 'CNY' }}</span>
            </div>
          </div>
        </div>

        <!-- Buyer & Seller Card -->
        <div class="detail-section border-glass">
          <h3 class="section-title">双方主体</h3>
          <div class="parties-wrapper">
            <div class="party-box">
              <div class="party-role party-role--buyer">购</div>
              <div class="party-info">
                <div class="party-name">{{ selectedInvoice.buyerName || '—' }}</div>
                <div class="party-tax-no font-mono" v-if="selectedInvoice.buyerTaxNo">税号: {{ selectedInvoice.buyerTaxNo }}</div>
              </div>
            </div>
            <div class="party-box">
              <div class="party-role party-role--seller">销</div>
              <div class="party-info">
                <div class="party-name">{{ selectedInvoice.sellerName || '—' }}</div>
                <div class="party-tax-no font-mono" v-if="selectedInvoice.sellerTaxNo">税号: {{ selectedInvoice.sellerTaxNo }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Amount Statistics -->
        <div class="detail-section border-glass">
          <h3 class="section-title">金额统计</h3>
          <div class="amount-grid">
            <div class="amt-box">
              <div class="amt-title">不含税金额</div>
              <div class="amt-val amt-val--neutral"><AmountDisplay :amount="selectedInvoice.totalAmount" /></div>
            </div>
            <div class="amt-box">
              <div class="amt-title">税额</div>
              <div class="amt-val amt-val--neutral"><AmountDisplay :amount="selectedInvoice.taxAmount" /></div>
            </div>
            <div class="amt-box">
              <div class="amt-title">价税合计</div>
              <div class="amt-val amt-val--primary"><AmountDisplay :amount="selectedInvoice.amountWithTax" bold colored /></div>
            </div>
          </div>
        </div>

        <!-- OCR Structural Items Table -->
        <div class="detail-section border-glass">
          <h3 class="section-title">商品行项目 ({{ selectedInvoice.items?.length || 0 }}行)</h3>
          <div class="items-table-container">
            <table class="line-items-table">
              <thead>
                <tr>
                  <th style="width: 40px">#</th>
                  <th>商品/劳务名称</th>
                  <th>规格/单位</th>
                  <th style="text-align: right">单价/数量</th>
                  <th style="text-align: right; width: 90px">不含税金额</th>
                  <th style="text-align: right; width: 70px">税额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedInvoice.items" :key="item.lineNo">
                  <td>{{ item.lineNo }}</td>
                  <td class="item-name-cell" :title="item.itemName">{{ item.itemName || '—' }}</td>
                  <td>
                    <div class="spec-unit">
                      <span v-if="item.specification">{{ item.specification }}</span>
                      <span v-if="item.unit" class="unit-tag">{{ item.unit }}</span>
                    </div>
                  </td>
                  <td style="text-align: right">
                    <div class="price-qty font-mono">
                      <div class="qty" v-if="item.quantity != null">{{ item.quantity }}</div>
                      <div class="price" v-if="item.unitPrice != null">@<AmountDisplay :amount="item.unitPrice" size="small" /></div>
                    </div>
                  </td>
                  <td style="text-align: right" class="font-mono"><AmountDisplay :amount="item.amount" size="small" /></td>
                  <td style="text-align: right" class="font-mono">
                    <div class="tax-cell">
                      <span><AmountDisplay :amount="item.taxAmount" size="small" /></span>
                      <span class="rate-label" v-if="item.taxRate != null">{{ Math.round(item.taxRate * 100) }}%</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="!selectedInvoice.items || selectedInvoice.items.length === 0">
                  <td colspan="6" style="text-align: center; color: var(--text-tertiary); padding: 20px 0;">
                    无商品明细条目
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- Frosted Glass Image Preview Modal -->
    <div v-if="previewOpen" class="preview-backdrop" @click="handleClosePreview">
      <div class="preview-glass-modal" @click.stop>
        <!-- Modal Toolbar -->
        <div class="preview-toolbar border-glass">
          <a-button type="text" class="tb-btn" @click="handleZoomIn" title="放大">
            <template #icon><ZoomInOutlined /></template>
          </a-button>
          <a-button type="text" class="tb-btn" @click="handleZoomOut" title="缩小">
            <template #icon><ZoomOutOutlined /></template>
          </a-button>
          <a-button type="text" class="tb-btn" @click="handleRotateLeft" title="向左旋转">
            <template #icon><RotateLeftOutlined /></template>
          </a-button>
          <a-button type="text" class="tb-btn" @click="handleRotateRight" title="向右旋转">
            <template #icon><RotateRightOutlined /></template>
          </a-button>
          <a-button type="text" class="tb-btn" @click="handleResetImage" title="重置">
            <template #icon><UndoOutlined /></template>
          </a-button>
          <span class="tb-divider"></span>
          <a-button type="text" class="tb-btn tb-btn--close" @click="handleClosePreview" title="关闭">
            <template #icon><CloseOutlined /></template>
          </a-button>
        </div>

        <!-- Image Container -->
        <div class="preview-img-container">
          <img
            :src="previewImageUrl"
            alt="发票原图"
            class="preview-img"
            :style="{
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
              cursor: isDragging ? 'grabbing' : 'grab',
            }"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import {
  queryInvoices,
  verifyInvoice,
  deleteInvoice,
  getInvoiceDetail,
} from '@/api/invoice'
import type { OcrResult } from '@/api/invoice'
import {
  FolderOpenOutlined,
  ScanOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileImageOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  FileSyncOutlined,
  DeleteOutlined,
  InboxOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  UndoOutlined,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import AmountDisplay from '@/components/AmountDisplay.vue'

// ─── Scope Toggle Logic ──────────────────────────────────────────────────────
const userStore = useUserStore()
const router = useRouter()

const queryScope = ref<'all' | 'mine'>('mine')

const pageTitle = computed(() => {
  return queryScope.value === 'all' ? '发票台账' : '我的发票夹'
})

// ─── Options Constants ──────────────────────────────────────────────────────
const typeOptions = [
  { value: 1, label: '增值税专用发票' },
  { value: 2, label: '增值税普通发票' },
  { value: 3, label: '电子发票' },
  { value: 4, label: '机打发票' },
  { value: 5, label: '定额发票' },
  { value: 6, label: '火车票' },
  { value: 7, label: '机票行程单' },
  { value: 8, label: '出租车票' },
  { value: 9, label: '其他' },
]

const verifyOptions = [
  { value: 0, label: '未查验' },
  { value: 2, label: '已验真' },
  { value: 3, label: '疑似假票' },
  { value: 4, label: '查验失败' },
]

// ─── Filter Form State ──────────────────────────────────────────────────────
interface FilterForm {
  keyword: string
  invoiceType: number | undefined
  verifyStatus: number | undefined
  isDuplicate: number | undefined
  dateRange: any
}

const filterForm = reactive<FilterForm>({
  keyword: '',
  invoiceType: undefined,
  verifyStatus: undefined,
  isDuplicate: undefined,
  dateRange: null,
})

// ─── Table Config ───────────────────────────────────────────────────────────
const loading = ref(false)
const tableData = ref<any[]>([])

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = computed(() => {
  const baseCols: any[] = [
    {
      title: '预览',
      key: 'thumbnail',
      width: 70,
      align: 'center' as const,
    },
    {
      title: '发票信息',
      key: 'invoiceInfo',
      width: 200,
    },
    {
      title: '销方名称',
      dataIndex: 'sellerName',
      key: 'sellerName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '开票日期',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 110,
      align: 'center' as const,
    },
    {
      title: '合计金额',
      key: 'amount',
      width: 140,
      align: 'right' as const,
    },
    {
      title: '真伪查验',
      key: 'verifyStatus',
      width: 110,
      align: 'center' as const,
    },
    {
      title: '查重状态',
      key: 'isDuplicate',
      width: 110,
      align: 'center' as const,
    },
    {
      title: '报销绑定',
      key: 'binding',
      width: 140,
      align: 'center' as const,
    },
  ]

  // If central ledger, append Uploader column
  if (queryScope.value === 'all') {
    baseCols.push({
      title: '上传人',
      key: 'uploader',
      width: 110,
    })
  }

  // Action column always goes last
  baseCols.push({
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right' as const,
  })

  return baseCols
})

// ─── Data Fetching ───────────────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (filterForm.keyword) params.keyword = filterForm.keyword.trim()
    if (filterForm.invoiceType !== undefined) params.invoiceType = filterForm.invoiceType
    if (filterForm.verifyStatus !== undefined) params.verifyStatus = filterForm.verifyStatus
    if (filterForm.isDuplicate !== undefined) params.isDuplicate = filterForm.isDuplicate
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    if (queryScope.value === 'mine' && (userStore.isFinance || userStore.isAdmin)) {
      params.mineOnly = true
    }

    // Call API
    const response = await queryInvoices(params)

    tableData.value = (response.list || []).map((item: any) => ({
      ...item,
      _verifying: false,
      _deleting: false,
    }))
    pagination.total = response.total
  } catch (error: any) {
    message.error(error.message || '加载发票列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.invoiceType = undefined
  filterForm.verifyStatus = undefined
  filterForm.isDuplicate = undefined
  filterForm.dateRange = null
  pagination.current = 1
  fetchList()
}

function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 10
  fetchList()
}

function handleScopeChange() {
  pagination.current = 1
  fetchList()
}

// ─── Actions & CRUD ─────────────────────────────────────────────────────────
function handleGoOcr() {
  router.push('/invoice/ocr')
}

function handleGoReimbursement(reimbId: number | string | undefined) {
  if (!reimbId) return
  router.push(`/reimbursement/${reimbId}`)
}

async function handleVerify(record: any) {
  record._verifying = true
  try {
    const updated = await verifyInvoice(record.id)
    message.success(`发票查验完成：${resolveVerifyStatusLabel(updated.checkResult?.verifyStatus)}`)
    fetchList()
  } catch (error: any) {
    message.error(error.message || '查验请求失败')
  } finally {
    record._verifying = false
  }
}

function handleDelete(record: any) {
  if (record.reimbursementId) {
    message.warning('该发票已被报销单关联，不可删除！')
    return
  }

  Modal.confirm({
    title: '确认删除发票？',
    content: '删除发票后将无法恢复，关联的OCR明细行也将被清除！',
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      record._deleting = true
      try {
        await deleteInvoice(record.id)
        message.success('发票删除成功')
        fetchList()
      } catch (error: any) {
        message.error(error.message || '删除发票失败')
      } finally {
        record._deleting = false
      }
    }
  })
}

// ─── Side Drawer Line Items ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const selectedInvoice = ref<OcrResult | null>(null)

async function handleViewDetail(record: any) {
  try {
    const detail = await getInvoiceDetail(record.id)
    selectedInvoice.value = detail
    drawerVisible.value = true
  } catch (error: any) {
    message.error(error.message || '获取发票明细失败')
  }
}

// ─── CSV Export ─────────────────────────────────────────────────────────────
function handleExportCsv() {
  if (tableData.value.length === 0) {
    message.warning('当前列表无发票数据可导出')
    return
  }

  // Headers
  const headers = [
    '发票号码', '发票代码', '发票类型', '开票日期', '销方名称',
    '购方名称', '不含税金额(元)', '税额(元)', '价税合计(元)',
    '查验状态', '查重状态', '关联报销单号', '上传人', '创建时间'
  ]

  // Rows
  const rows = tableData.value.map(row => {
    return [
      `\t${row.invoiceNo || ''}`,
      `\t${row.invoiceCode || ''}`,
      getInvoiceTypeLabel(row.invoiceType),
      row.invoiceDate || '',
      row.sellerName || '',
      row.buyerName || '',
      row.totalAmount != null ? row.totalAmount : 0,
      row.taxAmount != null ? row.taxAmount : 0,
      row.amountWithTax != null ? row.amountWithTax : 0,
      getVerifyStatusLabel(row.checkResult?.verifyStatus),
      row.checkResult?.isDuplicate === 1 ? '重复发票' : '唯一发票',
      row.reimbursementNo ? `#${row.reimbursementNo}` : '',
      row.createdByName || '',
      row.createdAt ? dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''
    ].map(val => {
      // Escape commas and double quotes for CSV formatting
      if (typeof val === 'string') {
        const cleaned = val.replace(/"/g, '""')
        return `"${cleaned}"`
      }
      return val
    })
  })

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `示例地区发票台账_${dayjs().format('YYYYMMDD_HHmmss')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  message.success('企业发票台账导出成功')
}

// ─── Image Preview Modal State & Controls ────────────────────────────────────
const previewOpen = ref(false)
const previewImageUrl = ref('')

const scale = ref(1)
const rotate = ref(0)
const translateX = ref(0)
const translateY = ref(0)

function handleOpenPreview(url: string | undefined) {
  if (!url) return
  previewImageUrl.value = url
  handleResetImage()
  previewOpen.value = true
}

function handleClosePreview() {
  previewOpen.value = false
}

function handleZoomIn() {
  scale.value = Math.min(scale.value + 0.25, 4)
}

function handleZoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.4)
}

function handleRotateLeft() {
  rotate.value = (rotate.value - 90) % 360
}

function handleRotateRight() {
  rotate.value = (rotate.value + 90) % 360
}

function handleResetImage() {
  scale.value = 1
  rotate.value = 0
  translateX.value = 0
  translateY.value = 0
}

// Panning
let isDragging = false
let startX = 0
let startY = 0

function handleMouseDown(e: MouseEvent) {
  isDragging = true
  startX = e.clientX - translateX.value
  startY = e.clientY - translateY.value
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return
  translateX.value = e.clientX - startX
  translateY.value = e.clientY - startY
}

function handleMouseUp() {
  isDragging = false
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────


function getInvoiceTypeLabel(type: number | undefined): string {
  if (type == null) return '其他'
  const matched = typeOptions.find(t => t.value === type)
  if (!matched) return '其他'
  return matched.label.startsWith('增值税') ? matched.label.substring(3) : matched.label
}

function getVerifyStatusLabel(status: number | undefined): string {
  if (status == null) return '未查验'
  switch (status) {
    case 0: return '未查验'
    case 1: return '查验中'
    case 2: return '已验真'
    case 3: return '疑似假票'
    case 4: return '查验失败'
    default: return '未知'
  }
}

function resolveVerifyStatusLabel(status: number | undefined): string {
  if (status == null) return '未查验'
  switch (status) {
    case 2: return '真票 (查验一致)'
    case 3: return '疑似假票 (存在安全隐患)'
    case 4: return '查验失败 (连接服务异常)'
    default: return '未查验'
  }
}

function getVerifyBadgeClass(status: number | undefined): string {
  if (status == null) return 'verify-badge--none'
  switch (status) {
    case 1: return 'verify-badge--verifying'
    case 2: return 'verify-badge--success'
    case 3: return 'verify-badge--danger'
    case 4: return 'verify-badge--warning'
    default: return 'verify-badge--none'
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
async function initScopeAndLoad() {
  if (!userStore.userInfo) {
    try {
      await userStore.getUserInfo()
    } catch {
      queryScope.value = 'mine'
      await fetchList()
      return
    }
  }

  queryScope.value = (userStore.isFinance || userStore.isAdmin) ? 'all' : 'mine'
  await fetchList()
}

onMounted(() => {
  initScopeAndLoad()
})
</script>

<style scoped lang="less">
/* ── Container shell ── */
.invoice-list {
  max-width: 1400px;
  margin: 0 auto;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
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

.upload-btn {
  height: 40px;
  padding: 0 20px;
  font-weight: 600;
  margin-right: 12px;
}

.export-btn {
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
}

/* ── View scope toggle ── */
.view-toggle-bar {
  margin-bottom: var(--sp-4);
  
  :deep(.ant-radio-group) {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-light);
    border-radius: var(--r-md);
    padding: 3px;

    .ant-radio-button-wrapper {
      border: none !important;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 500;
      border-radius: var(--r-sm);
      height: 32px;
      line-height: 32px;
      padding: 0 16px;
      transition: all var(--duration-fast) var(--ease-out);

      &:not(:first-child)::before {
        display: none !important;
      }

      &.ant-radio-button-wrapper-checked {
        background: var(--primary-gradient);
        color: #fff !important;
        box-shadow: 0 2px 6px rgba(79, 110, 247, 0.2);
      }
      
      &:hover:not(.ant-radio-button-wrapper-checked) {
        color: var(--primary);
      }
    }
  }
}

/* ── Glassmorphism helper ── */
.border-glass {
  background: rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: var(--r-xl) !important;
}

/* ── Filter Form ── */
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
  width: 200px;
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

/* ── Table Container ── */
.table-card {
  transition: box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out) !important;

  :deep(.ant-card-body) {
    padding: 0 !important;
  }

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

/* ── Modern Table Styling ── */
.invoice-table {
  :deep(.ant-table-thead > tr > th) {
    background: rgba(255, 255, 255, 0.02) !important;
    font-weight: 600 !important;
    font-size: 11px !important;
    color: var(--text-tertiary) !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--border-light) !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--border-light) !important;
    transition: background var(--duration-fast) var(--ease-out);
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: none !important;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: rgba(255, 255, 255, 0.02) !important;
  }

  :deep(.ant-pagination) {
    padding: 14px 20px;
    margin: 0 !important;
    border-top: 1px solid var(--border-light);
  }
}

/* ── Thumbnail ── */
.thumbnail-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  border: 1px solid var(--border-light);
  overflow: hidden;
  background: var(--bg-page);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 18px;
  color: var(--text-tertiary);
}

.thumbnail-hover-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.thumbnail-wrapper:hover .thumbnail-hover-mask {
  opacity: 1;
}

/* ── Invoice details cell ── */
.invoice-info-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invoice-type-tag {
  display: inline-flex;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--r-sm);
  background: rgba(79, 110, 247, 0.1);
  color: var(--primary);
  border: 1px solid rgba(79, 110, 247, 0.15);
}

.invoice-no-code {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

.info-label {
  color: var(--text-tertiary);
}

.info-value {
  color: var(--text-secondary);
}

/* ── Amount Cell ── */
.amount-cell-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.amount-with-tax {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  color: var(--primary);
}

.currency-symbol {
  font-size: 11px;
  font-weight: 600;
}

.amount-val {
  font-size: 14px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
}

.amount-sub-info {
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.tax-tag {
  color: var(--text-secondary);
}

/* ── Badges ── */
.verify-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--r-full);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.verify-badge--none {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  .badge-dot { background: var(--text-tertiary); }
}

.verify-badge--verifying {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
}

.verifying-spinner {
  font-size: 11px;
  animation: spin 1s linear infinite;
}

.verify-badge--success {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.15);
  .badge-dot { background: #52c41a; }
}

.verify-badge--danger {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
  box-shadow: 0 0 10px rgba(255, 77, 79, 0.2);
  .badge-dot { background: #ff4d4f; }
}

.verify-badge--warning {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
  .badge-dot { background: #faad14; }
}

/* ── Duplicate badge ── */
.duplicate-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--r-sm);
}

.duplicate-badge--error {
  background: rgba(255, 77, 79, 0.12);
  color: #ff4d4f;
  border: 1px solid rgba(255, 77, 79, 0.2);
  cursor: pointer;
}

.duplicate-badge--success {
  background: rgba(82, 196, 26, 0.08);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.15);
}

/* ── Binding status ── */
.binding-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
}

.tag-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.binding-tag--free {
  .tag-dot { background: #52c41a; }
}

.binding-link {
  font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 0;
  height: auto;
}

/* ── Uploader Cell ── */
.uploader-cell {
  display: flex;
  flex-direction: column;
}

.uploader-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.uploader-date {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ── Actions ── */
.table-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.action-btn {
  padding: 2px 6px !important;
  height: auto !important;
  font-size: 12px !important;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 3px;

  &--view {
    color: var(--text-secondary);
    &:hover { color: var(--primary); }
  }

  &--verify {
    color: #faad14;
    &:hover { color: #ffc069; }
  }

  &--danger {
    color: #ff4d4f;
    &:hover { color: #ff7875; }
  }
}

.disabled-action-btn {
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: not-allowed;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* ── Drawer & Items Table ── */
.invoice-detail-drawer {
  :deep(.ant-drawer-content) {
    background: rgba(25, 28, 41, 0.95);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  :deep(.ant-drawer-header) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    .ant-drawer-title {
      color: var(--text-primary);
      font-weight: 600;
    }
    .ant-drawer-close {
      color: var(--text-tertiary);
      &:hover { color: #fff; }
    }
  }
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  padding: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-top: 0;
  margin-bottom: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}

.grid-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.grid-label {
  color: var(--text-tertiary);
}

.grid-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Parties */
.parties-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.party-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--r-md);
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.party-role {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;

  &--buyer {
    background: rgba(79, 110, 247, 0.15);
    color: var(--primary);
  }

  &--seller {
    background: rgba(250, 173, 20, 0.15);
    color: #faad14;
  }
}

.party-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.party-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.party-tax-no {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Amounts Drawer */
.amount-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.amt-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--r-md);
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.amt-title {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.amt-val {
  font-size: 14px;
  font-weight: 700;
  font-family: 'SF Mono', monospace;

  &--neutral {
    color: var(--text-secondary);
  }

  &--primary {
    color: var(--primary);
  }
}

/* Line items table */
.items-table-container {
  overflow-x: auto;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th {
    background: rgba(255, 255, 255, 0.02);
    font-weight: 600;
    color: var(--text-tertiary);
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.item-name-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--text-primary);
}

.spec-unit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.unit-tag {
  background: rgba(255, 255, 255, 0.04);
  padding: 1px 4px;
  border-radius: var(--r-sm);
  align-self: flex-start;
}

.price-qty {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.qty {
  font-weight: 500;
  color: var(--text-secondary);
}

.tax-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.rate-label {
  font-size: 10px;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.04);
  padding: 0 4px;
  border-radius: var(--r-sm);
}

/* ── Frosted Glass Image Preview Modal ── */
.preview-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 12, 22, 0.7);
  backdrop-filter: blur(25px) saturate(140%);
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-glass-modal {
  position: relative;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-toolbar {
  position: absolute;
  top: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  z-index: 10;
  box-shadow: var(--shadow-card);

  .tb-btn {
    color: var(--text-secondary);
    font-size: 16px;
    width: 32px;
    height: 32px;
    border-radius: var(--r-md);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-fast);

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    &--close {
      color: #ff4d4f;
      &:hover {
        background: rgba(255, 77, 79, 0.15);
        color: #ff4d4f;
      }
    }
  }
}

.tb-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.preview-img-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-img {
  user-select: none;
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border-radius: var(--r-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ── Animations ── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 10px rgba(255, 77, 79, 0.2);
  }
  50% {
    opacity: .75;
    box-shadow: 0 0 4px rgba(255, 77, 79, 0.05);
  }
}

.font-mono {
  font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
}
</style>
