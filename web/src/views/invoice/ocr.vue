<template>
  <div class="invoice-ocr animate-fade-in-up">

    <!-- ── Page Header ── -->
    <div class="ocr-page-header">
      <div class="ocr-page-header__left">
        <h2 class="ocr-page-title">发票智能识别</h2>
      </div>
    </div>

    <a-row :gutter="24">

      <!-- ══ Left: Upload Panel ══ -->
      <a-col :xs="24" :md="10">
        <div class="upload-panel">

          <!-- Panel heading -->
          <div class="panel-heading">
            <span class="panel-heading__title">上传发票</span>
            <span class="panel-heading__badge">JPG · PNG · PDF</span>
          </div>

          <div v-if="ocrStatusSummary" class="ocr-runtime-summary">
            <RobotOutlined class="ocr-runtime-summary__icon" />
            <div class="ocr-runtime-summary__content">
              <div class="ocr-runtime-summary__title">{{ ocrStatusSummary }}</div>
            </div>
          </div>

          <!-- OCR 服务未启用提示 -->
          <a-alert
            v-if="!ocrEnabled"
            type="warning"
            show-icon
            style="margin-bottom: 16px"
            :message="'OCR 智能识别服务未启用'"
            :description="ocrDisabledReason || '请联系系统管理员配置 OCR 凭据后重试。'"
          />

          <!-- Drop zone -->
          <a-upload-dragger
            v-model:fileList="fileList"
            name="file"
            :multiple="false"
            :before-upload="beforeUpload"
            :show-upload-list="false"
            :disabled="!ocrEnabled"
            accept="image/jpeg,image/png,application/pdf"
            class="ocr-dragger"
            :class="{ 'has-file': fileList.length > 0, 'is-recognizing': recognizing, 'is-disabled': !ocrEnabled }"
          >
            <!-- Recognizing: scanning animation overlay -->
            <div v-if="recognizing" class="scan-overlay">
              <div class="scan-grid"></div>
              <div class="scan-line"></div>
              <div class="scan-corners">
                <span class="corner tl"></span>
                <span class="corner tr"></span>
                <span class="corner bl"></span>
                <span class="corner br"></span>
              </div>
              <div class="scan-label">
                <RobotOutlined class="scan-robot-icon" />
                <span>AI 识别中...</span>
              </div>
            </div>

            <!-- Preview when file selected -->
            <div v-else-if="previewUrl" class="preview-container">
              <img
                v-if="!isPdf"
                :src="previewUrl"
                alt="发票预览"
                class="preview-image"
              />
              <div v-else class="pdf-preview">
                <FilePdfOutlined class="pdf-icon" />
                <p class="pdf-name">{{ fileList[0]?.name }}</p>
              </div>
              <div class="preview-overlay">
                <a-button
                  type="primary"
                  ghost
                  size="small"
                  @click.stop="handleClearFile"
                >
                  重新选择
                </a-button>
              </div>
            </div>

            <!-- Empty drop state -->
            <div v-else class="drop-placeholder">
              <div class="drop-icon-ring">
                <div class="drop-icon-pulse"></div>
                <InboxOutlined class="drop-icon" />
              </div>
              <p class="drop-text">点击或拖拽发票文件到此区域</p>
              <p class="drop-hint">JPG · PNG · PDF</p>
            </div>
          </a-upload-dragger>

          <!-- File info bar -->
          <div class="file-info-bar" v-if="fileList.length > 0 && !recognizing">
            <PaperClipOutlined class="file-info-bar__icon" />
            <span class="file-info-bar__name">{{ fileList[0]?.name }}</span>
            <span class="file-info-bar__size">{{ formatFileSize(fileList[0]?.size) }}</span>
          </div>

          <!-- Recognize button -->
          <div class="recognize-btn-wrap" v-if="fileList.length > 0">
            <button
              class="recognize-btn"
              :class="{ 'is-loading': recognizing }"
              :disabled="recognizing"
              @click="handleRecognize"
            >
              <span class="recognize-btn__glow"></span>
              <ScanOutlined class="recognize-btn__icon" />
              <span>{{ recognizing ? 'AI 识别中...' : '开始 AI 识别' }}</span>
            </button>
          </div>

        </div>
      </a-col>

      <!-- ══ Right: Results Panel ══ -->
      <a-col :xs="24" :md="14">

        <!-- Results when available -->
        <template v-if="ocrResult">
          <div class="results-stack animate-stagger">

            <!-- ① Status bar -->
            <div class="result-status-bar">
              <div class="result-status-bar__left">
                <span
                  class="status-dot"
                  :class="{
                    'status-dot--success': ocrResult.recognitionStatus === 'SUCCESS',
                    'status-dot--warning': ocrResult.recognitionStatus === 'PARTIAL',
                    'status-dot--error':   ocrResult.recognitionStatus === 'FAILED',
                  }"
                ></span>
                <CheckCircleFilled
                  v-if="ocrResult.recognitionStatus === 'SUCCESS'"
                  class="status-icon status-icon--success"
                />
                <ExclamationCircleFilled
                  v-else-if="ocrResult.recognitionStatus === 'PARTIAL'"
                  class="status-icon status-icon--warning"
                />
                <CloseCircleFilled
                  v-else
                  class="status-icon status-icon--error"
                />
                <span
                  class="status-label"
                  :class="{
                    'status-label--success': ocrResult.recognitionStatus === 'SUCCESS',
                    'status-label--warning': ocrResult.recognitionStatus === 'PARTIAL',
                    'status-label--error':   ocrResult.recognitionStatus === 'FAILED',
                  }"
                >{{ statusLabel }}</span>
                <span class="status-time" v-if="ocrResult.processingTimeMs">
                  耗时 {{ ocrResult.processingTimeMs }} ms
                </span>
              </div>
              <div class="result-status-bar__right">
                <span class="confidence-label-text">置信度</span>
                <div class="confidence-bar-track">
                  <div
                    class="confidence-bar-fill"
                    :style="{ width: confidencePercent + '%', background: confidenceColor }"
                  ></div>
                </div>
                <span class="confidence-value" :style="{ color: confidenceColor }">
                  {{ confidencePercent }}%
                </span>
              </div>
            </div>

            <!-- ② Anomaly alerts -->
            <div class="anomaly-section" v-if="ocrResult.anomalyFlags?.length">
              <a-alert
                v-for="(flag, idx) in ocrResult.anomalyFlags"
                :key="idx"
                :type="anomalyAlertType(flag.severity)"
                :message="flag.title || '异常提示'"
                :description="flag.description"
                show-icon
                closable
                class="anomaly-alert"
              />
            </div>

            <!-- ③ Invoice info card -->
            <div class="result-card">
              <!-- SVG Dynamic Tax Stamp -->
              <div
                v-if="ocrResult.checkResult && ocrResult.checkResult.verifyStatus > 0"
                class="tax-stamp-container"
              >
                <div
                  class="tax-stamp animate-stamp"
                  :class="{
                    'tax-stamp--verifying': ocrResult.checkResult.verifyStatus === 1,
                    'tax-stamp--genuine':   ocrResult.checkResult.verifyStatus === 2,
                    'tax-stamp--suspect':   ocrResult.checkResult.verifyStatus === 3,
                    'tax-stamp--failed':    ocrResult.checkResult.verifyStatus === 4
                  }"
                >
                  <svg viewBox="0 0 160 160" width="160" height="160">
                    <defs>
                      <filter id="grunge-filter" x="0%" y="0%" width="100%" height="100%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.82 0" result="coloredNoise" />
                        <feComposite operator="in" in2="SourceGraphic" in="coloredNoise" result="noisyText" />
                        <feBlend mode="multiply" in="SourceGraphic" in2="noisyText" />
                      </filter>
                    </defs>
                    <g filter="url(#grunge-filter)">
                      <circle cx="80" cy="80" r="74" fill="none" stroke-width="2.5" class="stamp-circle" />
                      <circle cx="80" cy="80" r="54" fill="none" stroke-width="1.2" class="stamp-circle" />
                      <path id="stamp-text-path-top" d="M 16,80 A 64,64 0 0,1 144,80" fill="none" />
                      <path id="stamp-text-path-bottom" d="M 144,80 A 64,64 0 0,1 16,80" fill="none" />
                      <text class="stamp-circular-text">
                        <textPath href="#stamp-text-path-top" startOffset="50%" text-anchor="middle">
                          全国统一发票监制章
                        </textPath>
                      </text>
                      <text class="stamp-circular-text">
                        <textPath href="#stamp-text-path-bottom" startOffset="50%" text-anchor="middle">
                          示例地区系统查验真伪专用
                        </textPath>
                      </text>
                      <text x="80" y="86" class="stamp-center-text" text-anchor="middle">
                        {{ ocrResult.checkResult.verifyStatus === 1 ? '查验中' :
                           ocrResult.checkResult.verifyStatus === 2 ? '已验真' :
                           ocrResult.checkResult.verifyStatus === 3 ? '疑似假票' : '查验失败' }}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
              <div class="result-card__header">
                <div class="result-card__header-left">
                  <span class="result-card__title-bar"></span>
                  <span class="result-card__title">发票信息</span>
                </div>
                <a-tag
                  v-if="ocrResult.invoiceInfo?.invoiceType"
                  color="geekblue"
                  class="result-card__extra-tag"
                >
                  {{ ocrResult.invoiceInfo.invoiceType }}
                </a-tag>
              </div>
              <div class="result-card__body">
                <div class="field-grid">
                  <div class="field-item">
                    <span class="field-label">发票代码</span>
                    <span class="field-value">{{ ocrResult.invoiceInfo?.invoiceCode || '-' }}</span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">发票号码</span>
                    <span class="field-value field-value--strong">{{ ocrResult.invoiceInfo?.invoiceNumber || '-' }}</span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">开票日期</span>
                    <span class="field-value">{{ ocrResult.invoiceInfo?.invoiceDate || '-' }}</span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">校验码</span>
                    <span class="field-value">{{ ocrResult.invoiceInfo?.checkCode || '-' }}</span>
                  </div>
                  <div class="field-item field-item--full">
                    <span class="field-label">购方名称</span>
                    <span class="field-value">{{ ocrResult.invoiceInfo?.buyerName || '-' }}</span>
                  </div>
                  <div class="field-item field-item--full">
                    <span class="field-label">购方税号</span>
                    <span class="field-value field-value--mono">{{ ocrResult.invoiceInfo?.buyerTaxId || '-' }}</span>
                  </div>
                  <div class="field-item field-item--full">
                    <span class="field-label">销方名称</span>
                    <span class="field-value">{{ ocrResult.invoiceInfo?.sellerName || '-' }}</span>
                  </div>
                  <div class="field-item field-item--full">
                    <span class="field-label">销方税号</span>
                    <span class="field-value field-value--mono">{{ ocrResult.invoiceInfo?.sellerTaxId || '-' }}</span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">合计金额</span>
                    <span class="field-value field-value--amount"><AmountDisplay :amount="ocrResult.invoiceInfo?.totalAmount" /></span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">税额</span>
                    <span class="field-value field-value--amount"><AmountDisplay :amount="ocrResult.invoiceInfo?.taxAmount" /></span>
                  </div>
                  <div class="field-item field-item--full">
                    <span class="field-label">价税合计</span>
                    <span class="field-value field-value--total"><AmountDisplay :amount="ocrResult.invoiceInfo?.totalAmountWithTax" /></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ④ Items table -->
            <div class="result-card" v-if="ocrResult.items?.length">
              <div class="result-card__header">
                <div class="result-card__header-left">
                  <span class="result-card__title-bar"></span>
                  <span class="result-card__title">商品明细</span>
                </div>
                <span class="result-card__count">共 {{ ocrResult.items.length }} 项</span>
              </div>
              <div class="result-card__body result-card__body--no-pad">
                <a-table
                  :data-source="ocrResult.items"
                  :columns="itemColumns"
                  :row-key="(_r: any, idx: any) => String(idx)"
                  size="small"
                  :pagination="false"
                  :scroll="{ x: 700 }"
                  class="items-table"
                />
              </div>
            </div>

            <!-- ⑤ Category suggestion -->
            <div class="result-card result-card--category" v-if="ocrResult.suggestedCategory">
              <div class="result-card__header">
                <div class="result-card__header-left">
                  <span class="result-card__title-bar result-card__title-bar--accent"></span>
                  <span class="result-card__title">分类</span>
                </div>
              </div>
              <div class="result-card__body">
                <div class="category-row">
                  <div class="category-row__left">
                    <TagOutlined class="category-row__icon" />
                    <span class="category-name-tag">{{ ocrResult.suggestedCategory.name }}</span>
                    <span class="category-desc" v-if="ocrResult.suggestedCategory.description">
                      {{ ocrResult.suggestedCategory.description }}
                    </span>
                  </div>
                  <div class="category-row__right">
                    <span class="category-confidence-label">分类置信度</span>
                    <div class="confidence-bar-track confidence-bar-track--sm">
                      <div
                        class="confidence-bar-fill"
                        :style="{ width: categoryConfidencePercent + '%', background: categoryConfidenceColor }"
                      ></div>
                    </div>
                    <span class="confidence-value confidence-value--sm" :style="{ color: categoryConfidenceColor }">
                      {{ categoryConfidencePercent }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ⑥ Action buttons -->
            <div class="fill-actions">
              <button
                class="action-btn action-btn--primary"
                :disabled="!ocrResult.autoFillSuggestion"
                @click="handleAutoFill"
              >
                <FormOutlined />
                <span>填充到报销单</span>
              </button>
              <button
                class="action-btn action-btn--verify"
                :disabled="verifying || !ocrResult?.id"
                @click="handleVerify"
              >
                <LoadingOutlined v-if="verifying" />
                <FileSearchOutlined v-else />
                <span>{{ verifying ? '正在查验...' : '国税发票查验' }}</span>
              </button>
              <button class="action-btn action-btn--default" @click="handleReset">
                <ReloadOutlined />
                <span>重新识别</span>
              </button>
              <button class="action-btn action-btn--default" @click="handleCopyResult">
                <CopyOutlined />
                <span>复制结果</span>
              </button>
            </div>

          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="empty-panel animate-fade-in-up">
          <div class="empty-panel__hero">
            <div class="empty-hero-ring">
              <div class="empty-hero-ring__inner">
                <RobotOutlined class="empty-hero-icon" />
              </div>
            </div>
            <h3 class="empty-panel__title">暂无识别结果</h3>
          </div>

          <div class="features-grid animate-stagger">
            <div class="feature-card" v-for="f in features" :key="f.title">
              <div class="feature-card__icon-wrap">
                <component :is="f.icon" class="feature-card__icon" />
              </div>
              <div class="feature-card__title">{{ f.title }}</div>
            </div>
          </div>
        </div>

      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { UploadFile } from 'ant-design-vue'
import {
  ScanOutlined,
  InboxOutlined,
  FilePdfOutlined,
  PaperClipOutlined,
  TagOutlined,
  FormOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
  FileSearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'
import { getOcrStatus, verifyInvoice, type OcrStatus } from '@/api/invoice'
import AmountDisplay from '@/components/AmountDisplay.vue'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceInfo {
  invoiceType?: string
  invoiceCode?: string
  invoiceNumber?: string
  invoiceDate?: string
  checkCode?: string
  buyerName?: string
  buyerTaxId?: string
  sellerName?: string
  sellerTaxId?: string
  totalAmount?: number | string
  taxAmount?: number | string
  totalAmountWithTax?: number | string
}

interface InvoiceItem {
  lineNumber?: number
  name?: string
  spec?: string
  unit?: string
  quantity?: number | string
  unitPrice?: number | string
  amount?: number | string
  taxRate?: string
  taxAmount?: number | string
}

interface AnomalyFlag {
  severity: 'error' | 'warning' | 'info'
  title?: string
  description?: string
}

interface SuggestedCategory {
  name: string
  description?: string
  confidence?: number
}

interface AutoFillSuggestion {
  title?: string
  amount?: number | string
  categoryId?: number
  remark?: string
  items?: Array<{
    description?: string
    amount?: number | string
    categoryId?: number
  }>
}

interface CheckResult {
  verifyStatus: number
  verifyStatusLabel?: string
  isDuplicate?: number
  duplicateReimbNo?: string
}

interface OcrResult {
  id?: number | string
  recognitionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  confidence?: number
  processingTimeMs?: number
  invoiceInfo?: InvoiceInfo
  items?: InvoiceItem[]
  anomalyFlags?: AnomalyFlag[]
  suggestedCategory?: SuggestedCategory
  autoFillSuggestion?: AutoFillSuggestion
  checkResult?: CheckResult
}

// ─── State ───────────────────────────────────────────────────────────────────

const router = useRouter()
const fileList = ref<UploadFile[]>([])
const previewUrl = ref<string>('')
const isPdf = ref(false)
const recognizing = ref(false)
const verifying = ref(false)
const ocrResult = ref<OcrResult | null>(null)
const expenseCategories = ref<any[]>([])

// OCR 服务可用性预检 — 避免用户上传后才发现没配 API Key
const ocrEnabled = ref<boolean>(true)
const ocrDisabledReason = ref<string>('')
const ocrStatus = ref<OcrStatus | null>(null)

const ocrStatusSummary = computed(() => {
  if (!ocrStatus.value?.providerLabel) {
    return ''
  }
  if (ocrStatus.value.fallbackProviderLabel) {
    return `当前主识别: ${ocrStatus.value.providerLabel} · 兜底: ${ocrStatus.value.fallbackProviderLabel}`
  }
  return `当前主识别: ${ocrStatus.value.providerLabel}`
})

onMounted(async () => {
  try {
    const status = await getOcrStatus()
    ocrStatus.value = status || null
    ocrEnabled.value = !!status?.enabled
    ocrDisabledReason.value = status?.message || ''
    if (!ocrEnabled.value) {
      message.warning(ocrDisabledReason.value || 'OCR 服务暂不可用')
    }
  } catch {
    // 预检失败不阻塞页面,仅在真正上传时报错
  }

  try {
    expenseCategories.value = await request.get<any[]>('/v1/expense-categories')
  } catch (e) {
    console.error('Failed to load expense categories', e)
  }
})
// ─── Features for empty state ────────────────────────────────────────────────

const features = [
  {
    icon: h(FileSearchOutlined),
    title: '智能提取',
    desc: '自动识别发票各字段',
  },
  {
    icon: h(RobotOutlined),
    title: 'AI 分类',
    desc: '智能推荐报销类别',
  },
  {
    icon: h(ThunderboltOutlined),
    title: '一键填充',
    desc: '自动填入报销单表单',
  },
]

// ─── Item table columns ───────────────────────────────────────────────────────

const itemColumns = [
  {
    title: '行号',
    dataIndex: 'lineNumber',
    width: 50,
    align: 'center' as const,
    customRender: ({ index }: { index: number }) => index + 1,
  },
  {
    title: '品名',
    dataIndex: 'name',
    width: 140,
    ellipsis: true,
  },
  {
    title: '规格',
    dataIndex: 'spec',
    width: 80,
    ellipsis: true,
  },
  {
    title: '单位',
    dataIndex: 'unit',
    width: 60,
    align: 'center' as const,
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 70,
    align: 'right' as const,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 90,
    align: 'right' as const,
    customRender: ({ text }: { text: number | string }) =>
      text != null ? `¥${Number(text).toFixed(2)}` : '-',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 90,
    align: 'right' as const,
    customRender: ({ text }: { text: number | string }) =>
      text != null ? `¥${Number(text).toFixed(2)}` : '-',
  },
  {
    title: '税率',
    dataIndex: 'taxRate',
    width: 60,
    align: 'center' as const,
  },
  {
    title: '税额',
    dataIndex: 'taxAmount',
    width: 80,
    align: 'right' as const,
    customRender: ({ text }: { text: number | string }) =>
      text != null ? `¥${Number(text).toFixed(2)}` : '-',
  },
]

// ─── Computed ─────────────────────────────────────────────────────────────────

const statusLabel = computed(() => {
  switch (ocrResult.value?.recognitionStatus) {
    case 'SUCCESS': return '识别成功'
    case 'PARTIAL': return '部分识别'
    case 'FAILED':  return '识别失败'
    default:        return '未知状态'
  }
})

const confidencePercent = computed(() => {
  const c = ocrResult.value?.confidence ?? 0
  return Math.round(c * 100)
})

const confidenceColor = computed(() => {
  const p = confidencePercent.value
  if (p >= 90) return '#52c41a'
  if (p >= 70) return '#faad14'
  return '#ff4d4f'
})

const categoryConfidencePercent = computed(() => {
  const c = ocrResult.value?.suggestedCategory?.confidence ?? 0
  return Math.round(c * 100)
})

const categoryConfidenceColor = computed(() => {
  const p = categoryConfidencePercent.value
  if (p >= 85) return '#52c41a'
  if (p >= 60) return '#faad14'
  return '#ff7a45'
})

// ─── Upload helpers ───────────────────────────────────────────────────────────

function beforeUpload(file: File): boolean {
  const isImage = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
  if (!isImage) {
    message.error('只支持 JPG、PNG 格式图片或 PDF 文件')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB')
    return false
  }

  isPdf.value = file.type === 'application/pdf'

  // Generate preview for images
  if (!isPdf.value) {
    const reader = new FileReader()
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  } else {
    previewUrl.value = 'pdf'
  }

  // Reset previous result when new file is selected
  ocrResult.value = null

  return false // Prevent auto-upload
}

function handleClearFile() {
  fileList.value = []
  previewUrl.value = ''
  isPdf.value = false
  ocrResult.value = null
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatAmount(val?: number | string): string {
  if (val == null || val === '') return '-'
  return Number(val).toFixed(2)
}

function anomalyAlertType(severity: string): 'error' | 'warning' | 'info' {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

// ─── Data Adapter ────────────────────────────────────────────────────────────

function adaptOcrResult(backendData: any): OcrResult {
  if (!backendData) return {} as OcrResult

  // 1. Map recognitionStatus (Integer -> String)
  let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS'
  if (backendData.recognitionStatus === 3) {
    status = 'FAILED'
  } else if (backendData.recognitionStatus === 1) {
    status = 'PARTIAL'
  } else if (backendData.recognitionStatus === 2) {
    status = 'SUCCESS'
  }

  // 2. Map invoiceInfo
  const invoiceInfo: InvoiceInfo = {
    invoiceType: backendData.invoiceTypeName || backendData.invoiceType,
    invoiceCode: backendData.invoiceCode,
    invoiceNumber: backendData.invoiceNo, // backend invoiceNo -> invoiceNumber
    invoiceDate: backendData.invoiceDate,
    checkCode: backendData.checkCode || '',
    buyerName: backendData.buyerName,
    buyerTaxId: backendData.buyerTaxNo, // backend buyerTaxNo -> buyerTaxId
    sellerName: backendData.sellerName,
    sellerTaxId: backendData.sellerTaxNo, // backend sellerTaxNo -> sellerTaxId
    totalAmount: backendData.totalAmount,
    taxAmount: backendData.taxAmount,
    totalAmountWithTax: backendData.amountWithTax, // backend amountWithTax -> totalAmountWithTax
  }

  // 3. Map items
  const items: InvoiceItem[] = (backendData.items || []).map((item: any) => ({
    lineNumber: item.lineNo, // lineNo -> lineNumber
    name: item.itemName, // itemName -> name
    spec: item.specification, // specification -> spec
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    taxRate: item.taxRate != null ? `${Number(item.taxRate) * 100}%` : '-',
    taxAmount: item.taxAmount,
  }))

  // 4. Map suggestedCategory
  const suggestedCategory: SuggestedCategory | undefined = backendData.suggestedCategory ? {
    name: backendData.suggestedCategory.name,
    description: backendData.suggestedCategory.description,
    confidence: backendData.suggestedCategory.confidence,
  } : undefined

  // 5. Map anomalyFlags
  const anomalyFlags: AnomalyFlag[] = (backendData.anomalyFlags || []).map((flag: any) => ({
    severity: flag.severity?.toLowerCase() === 'error' ? 'error' : (flag.severity?.toLowerCase() === 'warning' ? 'warning' : 'info'),
    title: flag.message || flag.title || '异常提示',
    description: flag.description || '',
  }))

  // 6. Map autoFillSuggestion & category mapping
  const autoFillSuggestion: AutoFillSuggestion | undefined = backendData.autoFillSuggestion ? {
    title: backendData.autoFillSuggestion.title,
    amount: backendData.autoFillSuggestion.amount,
    remark: backendData.autoFillSuggestion.remark,
    items: (backendData.autoFillSuggestion.items || []).map((item: any) => ({
      description: item.description,
      amount: item.amount,
      categoryId: undefined,
    })),
  } : undefined

  // Match categoryId
  if (autoFillSuggestion && backendData.suggestedCategory) {
    const sugCode = backendData.suggestedCategory.code
    const sugName = backendData.suggestedCategory.name
    
    // Find matching category in expenseCategories
    const matchedCategory = expenseCategories.value.find(
      c => c.code === sugCode || c.name === sugName
    )
    if (matchedCategory) {
      autoFillSuggestion.categoryId = matchedCategory.id
      if (autoFillSuggestion.items) {
        autoFillSuggestion.items.forEach((item: any) => {
          item.categoryId = matchedCategory.id
        })
      }
    }
  }

  // 7. Map checkResult
  const checkResult: CheckResult = {
    verifyStatus: backendData.checkResult?.verifyStatus ?? 0,
    verifyStatusLabel: backendData.checkResult?.verifyStatusLabel || '未查验',
    isDuplicate: backendData.checkResult?.isDuplicate ?? 0,
  }

  return {
    id: backendData.id,
    recognitionStatus: status,
    confidence: backendData.confidence,
    processingTimeMs: backendData.processingTimeMs,
    invoiceInfo,
    items,
    anomalyFlags,
    suggestedCategory,
    autoFillSuggestion,
    checkResult,
  }
}

// ─── OCR recognition ─────────────────────────────────────────────────────────

async function handleRecognize() {
  if (!fileList.value.length) {
    message.warning('请先上传发票文件')
    return
  }

  const rawFile = fileList.value[0].originFileObj as File | undefined
  if (!rawFile) {
    message.error('无法读取文件，请重新选择')
    return
  }

  recognizing.value = true
  ocrResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', rawFile)

    const result = await request.post<any>('/v1/invoices/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })

    ocrResult.value = adaptOcrResult(result)

    if (ocrResult.value.recognitionStatus === 'SUCCESS') {
      message.success('发票识别成功')
    } else if (ocrResult.value.recognitionStatus === 'PARTIAL') {
      message.warning('发票部分识别，请检查结果')
    } else {
      message.error('发票识别失败，请检查图片质量后重试')
    }
  } catch (err) {
    console.error('OCR recognition error:', err)
  } finally {
    recognizing.value = false
  }
}

// ─── Action Verification ─────────────────────────────────────────────────────

async function handleVerify() {
  if (!ocrResult.value?.id) {
    message.warning('无法获取发票记录ID')
    return
  }
  verifying.value = true
  
  if (ocrResult.value.checkResult) {
    ocrResult.value.checkResult.verifyStatus = 1
    ocrResult.value.checkResult.verifyStatusLabel = '查验中'
  }
  
  try {
    const result = await verifyInvoice(ocrResult.value.id)
    ocrResult.value = adaptOcrResult(result)
    const verifyStatus = ocrResult.value.checkResult?.verifyStatus
    
    if (verifyStatus === 2) {
      message.success('国税验真成功：发票状态真实有效')
    } else if (verifyStatus === 3) {
      message.warning('查验警示：疑似虚假/重复发票')
    } else if (verifyStatus === 4) {
      message.error('发票验真失败：查验无此发票或系统故障')
    } else {
      message.info(`发票查验状态：${ocrResult.value.checkResult?.verifyStatusLabel || '未知'}`)
    }
  } catch (err) {
    console.error('Invoice verification error:', err)
    if (ocrResult.value.checkResult) {
      ocrResult.value.checkResult.verifyStatus = 4
      ocrResult.value.checkResult.verifyStatusLabel = '查验失败'
    }
    message.error('发票查验接口调用失败')
  } finally {
    verifying.value = false
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function handleAutoFill() {
  if (!ocrResult.value?.autoFillSuggestion) {
    message.warning('暂无自动填充数据')
    return
  }
  sessionStorage.setItem('ocrAutoFill', JSON.stringify(ocrResult.value.autoFillSuggestion))
  message.success('识别数据已准备好，正在跳转到报销单...')
  router.push('/reimbursement/create')
}

function handleReset() {
  handleClearFile()
  message.info('已重置，请重新上传发票')
}

async function handleCopyResult() {
  if (!ocrResult.value) return
  try {
    const info = ocrResult.value.invoiceInfo
    const lines = [
      `发票号码：${info?.invoiceNumber || '-'}`,
      `开票日期：${info?.invoiceDate || '-'}`,
      `销方名称：${info?.sellerName || '-'}`,
      `价税合计：¥${formatAmount(info?.totalAmountWithTax)}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    message.success('识别结果已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}
</script>

<style scoped lang="less">
/* ══════════════════════════════════════════════════════
   示例地区报销 · OCR 智能识别页
   风格: 科技感 · 玻璃拟态 · 圆润 · 脉冲/扫描动效
   ══════════════════════════════════════════════════════ */

/* ── Page wrapper ── */
.invoice-ocr {
  padding-bottom: 32px;
}

.ocr-runtime-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(22, 119, 255, 0.16);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.08), rgba(82, 196, 26, 0.08));
}

.ocr-runtime-summary__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #1677ff;
  font-size: 18px;
}

.ocr-runtime-summary__content {
  min-width: 0;
}

.ocr-runtime-summary__title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.ocr-runtime-summary__detail {
  margin-top: 2px;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

/* ── Page header ── */
.ocr-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.ocr-page-header__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ocr-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--r-full);
  background: var(--primary-bg);
  border: 1px solid rgba(79, 110, 247, 0.2);
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.08em;
  width: fit-content;
}

.ocr-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 110, 247, 0.4); }
  50%       { opacity: 0.8; transform: scale(1.15); box-shadow: 0 0 0 4px rgba(79, 110, 247, 0); }
}

.ocr-page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  line-height: 1.3;
}

.ocr-page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.6;
}

.ocr-page-header__tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: var(--r-lg);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* ══ Upload panel ══ */
.upload-panel {
  background: var(--bg-container);
  border-radius: var(--r-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 20px;
  transition: box-shadow var(--duration-normal) var(--ease-out);

  &:hover {
    box-shadow: var(--shadow-card-hover);
  }
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-heading__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.panel-heading__badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: var(--r-full);
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  letter-spacing: 0.04em;
}

/* ── Drop zone ── */
.ocr-dragger {
  /* Override ant-design dragger styles */
  :deep(.ant-upload-drag) {
    border-radius: var(--r-lg) !important;
    border: 2px dashed var(--border) !important;
    background: var(--bg-page) !important;
    min-height: 240px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: border-color 0.35s var(--ease-out), background 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out) !important;
    overflow: hidden !important;
    position: relative !important;
  }

  :deep(.ant-upload-drag:hover) {
    border-color: var(--primary) !important;
    background: var(--primary-bg) !important;
    box-shadow: 0 0 0 4px rgba(79, 110, 247, 0.06) !important;
  }

  :deep(.ant-upload-btn) {
    padding: 0 !important;
    height: 100% !important;
  }

  &.has-file :deep(.ant-upload-drag) {
    border-color: var(--primary) !important;
    background: rgba(79, 110, 247, 0.03) !important;
  }

  &.is-recognizing :deep(.ant-upload-drag) {
    border-color: var(--primary) !important;
    border-style: solid !important;
    background: rgba(10, 15, 40, 0.97) !important;
    cursor: default !important;
  }
}

/* ── Scan overlay (recognizing state) ── */
.scan-overlay {
  position: relative;
  width: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--r-lg);
}

.scan-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(79, 110, 247, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 110, 247, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  animation: gridFade 3s ease-in-out infinite;
}

@keyframes gridFade {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), rgba(123, 147, 255, 0.9), var(--primary), transparent);
  box-shadow: 0 0 12px 3px rgba(79, 110, 247, 0.5), 0 0 40px 8px rgba(79, 110, 247, 0.15);
  animation: scanDown 2s linear infinite;
  top: 0;
}

@keyframes scanDown {
  0%   { top: 5%; opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { top: 95%; opacity: 0; }
}

/* Corner markers */
.scan-corners {
  position: absolute;
  inset: 16px;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: var(--primary);
  border-style: solid;
  border-width: 0;
  animation: cornerPulse 2s ease-in-out infinite;
}

.corner.tl { top: 0; left: 0;  border-top-width: 2px; border-left-width: 2px;  border-top-left-radius: 4px; }
.corner.tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: 4px; }
.corner.bl { bottom: 0; left: 0;  border-bottom-width: 2px; border-left-width: 2px;  border-bottom-left-radius: 4px; }
.corner.br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: 4px; }

@keyframes cornerPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; box-shadow: 0 0 8px rgba(79, 110, 247, 0.6); }
}

.scan-label {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-shadow: 0 0 12px rgba(79, 110, 247, 0.8);
}

.scan-robot-icon {
  font-size: 36px;
  color: var(--primary-light);
  animation: robotFloat 2s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(79, 110, 247, 0.6));
}

@keyframes robotFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}

/* ── Drop placeholder (empty state) ── */
.drop-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  user-select: none;
}

.drop-icon-ring {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.drop-icon-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--primary);
  opacity: 0;
  animation: ringPulse 2.5s ease-out infinite;
}

.drop-icon-pulse::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1.5px solid var(--primary);
  opacity: 0;
  animation: ringPulse 2.5s ease-out 0.6s infinite;
}

@keyframes ringPulse {
  0%   { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}

.drop-icon {
  font-size: 34px;
  color: var(--primary);
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 6px rgba(79, 110, 247, 0.3));
  transition: transform 0.25s var(--ease-spring);

  .ocr-dragger:deep(.ant-upload-drag:hover) & {
    transform: scale(1.1);
  }
}

.drop-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.drop-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  letter-spacing: 0.02em;
}

/* ── Preview ── */
.preview-container {
  position: relative;
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover .preview-overlay {
    opacity: 1;
  }
}

.preview-image {
  max-width: 100%;
  max-height: 270px;
  border-radius: var(--r-md);
  object-fit: contain;
  box-shadow: var(--shadow-md);
}

.pdf-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 24px;

  .pdf-icon {
    font-size: 52px;
    color: #ef4444;
    filter: drop-shadow(0 2px 6px rgba(239, 68, 68, 0.3));
  }

  .pdf-name {
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
  }
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: var(--r-md);
  backdrop-filter: blur(2px);
}

/* ── File info bar ── */
.file-info-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 7px 12px;
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  border-radius: var(--r-md);
  font-size: 12px;

  &__icon {
    color: var(--primary);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }

  &__size {
    flex-shrink: 0;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
}

/* ── Recognize button ── */
.recognize-btn-wrap {
  margin-top: 14px;
}

.recognize-btn {
  position: relative;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: var(--r-lg);
  background: var(--primary-gradient);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(79, 110, 247, 0.35);
  transition: all 0.25s var(--ease-out);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(79, 110, 247, 0.5);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &__glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    transform: translateX(-100%);
    animation: btnShine 2.5s ease-in-out infinite;
  }

  &.is-loading &__glow {
    animation: btnShine 1.2s ease-in-out infinite;
  }

  &__icon {
    font-size: 17px;
    position: relative;
  }

  span {
    position: relative;
  }
}

@keyframes btnShine {
  0%   { transform: translateX(-100%); }
  60%, 100% { transform: translateX(100%); }
}

/* ── Upload tips ── */
.upload-tips {
  margin-top: 14px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.6;
  padding: 9px 12px;
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: var(--r-md);

  &__icon {
    color: #f59e0b;
    flex-shrink: 0;
    margin-top: 2px;
  }
}

/* ══ Results panel ══ */
.results-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Status bar ── */
.result-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  gap: 12px;
  flex-wrap: wrap;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &--success { background: var(--success); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15); }
  &--warning { background: var(--warning); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  &--error   { background: var(--error);   box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
}

.status-icon {
  font-size: 16px;
  &--success { color: var(--success); }
  &--warning { color: var(--warning); }
  &--error   { color: var(--error); }
}

.status-label {
  font-size: 13px;
  font-weight: 700;
  &--success { color: var(--success); }
  &--warning { color: var(--warning); }
  &--error   { color: var(--error); }
}

.status-time {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  padding: 2px 7px;
  background: var(--bg-page);
  border-radius: var(--r-full);
  border: 1px solid var(--border-light);
}

.confidence-label-text {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.confidence-bar-track {
  width: 100px;
  height: 6px;
  background: var(--border-light);
  border-radius: var(--r-full);
  overflow: hidden;

  &--sm {
    width: 80px;
    height: 5px;
  }
}

.confidence-bar-fill {
  height: 100%;
  border-radius: var(--r-full);
  transition: width 0.8s var(--ease-out);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: 30%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35));
    border-radius: var(--r-full);
  }
}

.confidence-value {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;

  &--sm {
    font-size: 12px;
    min-width: 32px;
  }
}

/* ── Anomaly alerts ── */
.anomaly-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.anomaly-alert {
  border-radius: var(--r-md) !important;
}

/* ── Result cards ── */
.result-card {
  position: relative; // Need relative positioning for absolute stamp overlay
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: box-shadow var(--duration-normal) var(--ease-out);

  &:hover {
    box-shadow: var(--shadow-card-hover);
  }

  &--category {
    background: linear-gradient(135deg, var(--bg-container) 0%, rgba(79, 110, 247, 0.02) 100%);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-page);
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title-bar {
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: var(--primary-gradient);
    flex-shrink: 0;

    &--accent {
      background: linear-gradient(135deg, #7b93ff, #a78bfa);
    }
  }

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  &__extra-tag {
    border-radius: var(--r-sm) !important;
  }

  &__count {
    font-size: 12px;
    color: var(--text-tertiary);
    padding: 2px 8px;
    background: var(--primary-bg);
    border-radius: var(--r-full);
    font-weight: 600;
    color: var(--primary);
  }

  &__body {
    padding: 16px;

    &--no-pad {
      padding: 0;
    }
  }
}

/* ── Field grid (invoice info) ── */
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  border-right: 1px solid var(--border-light);
  transition: background var(--duration-fast) var(--ease-out);

  &:hover {
    background: var(--bg-page);
  }

  /* Remove right border on second column */
  &:nth-child(2n) {
    border-right: none;
  }

  /* Full-width items */
  &--full {
    grid-column: 1 / -1;
    border-right: none;
  }

  /* Last row: remove bottom border */
  &:last-child,
  &:nth-last-child(2):not(.field-item--full) {
    border-bottom: none;
  }
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

.field-value {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-all;

  &--strong {
    font-weight: 700;
    color: var(--primary-dark);
    font-variant-numeric: tabular-nums;
  }

  &--mono {
    font-family: 'Menlo', 'Courier New', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.03em;
  }

  &--amount {
    font-family: 'Menlo', 'Courier New', monospace;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  &--total {
    font-family: 'Menlo', 'Courier New', monospace;
    font-size: 17px;
    font-weight: 800;
    color: #c2410c;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
}

/* ── Items table ── */
.items-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--bg-page) !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    color: var(--text-tertiary) !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 9px 10px !important;
    border-bottom: 1px solid var(--border-light) !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    font-size: 12px !important;
    padding: 8px 10px !important;
    border-bottom: 1px solid var(--border-light) !important;
    color: var(--text-secondary);
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--primary-bg) !important;
  }
}

/* ── Category row ── */
.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__icon {
    font-size: 16px;
    color: var(--primary);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.category-name-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: var(--r-full);
  background: var(--primary-bg);
  border: 1px solid rgba(79, 110, 247, 0.18);
  color: var(--primary-dark);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.category-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.category-confidence-label {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* ── Action buttons ── */
.fill-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: var(--r-lg);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);

  &--primary {
    background: var(--primary-gradient);
    color: #fff;
    box-shadow: 0 3px 10px rgba(79, 110, 247, 0.3);

    &:hover:not(:disabled) {
      box-shadow: 0 6px 18px rgba(79, 110, 247, 0.45);
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--default {
    background: var(--bg-container);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-xs);

    &:hover {
      color: var(--primary);
      border-color: var(--primary);
      background: var(--primary-bg);
      transform: translateY(-1px);
    }
  }

  &--verify {
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    color: #fff;
    box-shadow: 0 3px 10px rgba(13, 148, 136, 0.3);

    &:hover:not(:disabled) {
      box-shadow: 0 6px 18px rgba(13, 148, 136, 0.45);
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.97);
  }
}

/* ══ Empty panel ══ */
.empty-panel {
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-card);
  padding: 48px 32px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
  min-height: 460px;

  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: -0.01em;
  }

  &__hint {
    margin: 0;
    font-size: 13px;
    color: var(--text-tertiary);
    line-height: 1.6;
    max-width: 340px;
  }
}

/* Hero icon ring */
.empty-hero-ring {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(79, 110, 247, 0.2);
    animation: heroRingExpand 3s ease-out infinite;
  }

  &::before {
    inset: 0;
    animation-delay: 0s;
  }

  &::after {
    inset: -14px;
    animation-delay: 0.8s;
    border-color: rgba(79, 110, 247, 0.1);
  }
}

@keyframes heroRingExpand {
  0%   { opacity: 0.8; transform: scale(0.9); }
  100% { opacity: 0;   transform: scale(1.3); }
}

.empty-hero-ring__inner {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(79, 110, 247, 0.1), rgba(123, 147, 255, 0.06));
  border: 1.5px solid rgba(79, 110, 247, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 24px rgba(79, 110, 247, 0.1), inset 0 1px 0 rgba(255,255,255,0.5);
  position: relative;
  z-index: 1;
}

.empty-hero-icon {
  font-size: 34px;
  color: var(--primary);
  filter: drop-shadow(0 2px 6px rgba(79, 110, 247, 0.35));
  animation: robotFloat 3.5s ease-in-out infinite;
}

/* ── Feature cards grid ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 440px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 10px 14px;
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  border-radius: var(--r-lg);
  text-align: center;
  cursor: default;
  transition: all var(--duration-normal) var(--ease-out);

  &:hover {
    background: var(--primary-bg);
    border-color: rgba(79, 110, 247, 0.2);
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-3px);

    .feature-card__icon-wrap {
      background: rgba(79, 110, 247, 0.12);
    }

    .feature-card__icon {
      color: var(--primary-dark);
      transform: scale(1.1);
    }
  }

  &__icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: var(--r-md);
    background: var(--primary-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--duration-normal) var(--ease-out);
  }

  &__icon {
    font-size: 20px;
    color: var(--primary);
    transition: all var(--duration-normal) var(--ease-spring);
  }

  &__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  &__desc {
    font-size: 11px;
    color: var(--text-tertiary);
    line-height: 1.5;
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .ocr-page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .features-grid {
    max-width: 100%;
  }

  .fill-actions {
    flex-wrap: wrap;
  }

  .result-status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

/* ── SVG Concentric circular Tax Stamp Overlay ── */
.tax-stamp-container {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  pointer-events: none;
}

.tax-stamp {
  width: 140px;
  height: 140px;
  opacity: 0.85;
  transform: rotate(-12deg);
  
  svg {
    width: 100%;
    height: 100%;
  }

  .stamp-circle {
    stroke-dasharray: none;
  }

  .stamp-circular-text {
    font-family: "STFangsong", "仿宋", "SimSun", serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .stamp-center-text {
    font-family: "STHeiti", "黑体", "SimHei", sans-serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  // Colors depending on status
  &--verifying {
    color: #3b82f6; // Slate Blue
    .stamp-circle { stroke: #3b82f6; }
    .stamp-circular-text { fill: #3b82f6; }
    .stamp-center-text { fill: #3b82f6; }
    animation: stampPulse 1.8s infinite ease-in-out;
  }

  &--genuine {
    color: #e11d48; // Crimson Red
    .stamp-circle { stroke: #e11d48; }
    .stamp-circular-text { fill: #e11d48; }
    .stamp-center-text { fill: #e11d48; }
  }

  &--suspect {
    color: #ea580c; // Amber Orange
    .stamp-circle { stroke: #ea580c; }
    .stamp-circular-text { fill: #ea580c; }
    .stamp-center-text { fill: #ea580c; }
  }

  &--failed {
    color: #64748b; // Slate Gray
    .stamp-circle { stroke: #64748b; }
    .stamp-circular-text { fill: #64748b; }
    .stamp-center-text { fill: #64748b; }
  }
}

/* Stamp spring-in entry animation */
.animate-stamp {
  animation: stampSpring 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes stampSpring {
  0% {
    opacity: 0;
    transform: rotate(-45deg) scale(2.2);
    filter: blur(2px);
  }
  100% {
    opacity: 0.85;
    transform: rotate(-12deg) scale(1);
    filter: blur(0);
  }
}

@keyframes stampPulse {
  0%, 100% {
    transform: rotate(-12deg) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: rotate(-12deg) scale(1.05);
    opacity: 0.95;
  }
}
</style>
