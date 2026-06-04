<template>
  <div class="operation-logs page-container">
    <!-- Page Header -->
    <div class="page-header animate-fade-in-up">
      <div>
        <h2 class="page-title">
          <span class="page-title__icon"><FileSearchOutlined /></span>
          操作日志
        </h2>
      </div>
    </div>

    <!-- Filter Card -->
    <a-card class="filter-card animate-fade-in-up" style="animation-delay: 0.05s">
      <div class="filter-inner">
        <div class="filter-fields">
          <div class="filter-field">
            <label class="filter-label">操作人</label>
            <a-input
              v-model:value="query.userName"
              placeholder="输入操作人姓名"
              allow-clear
              class="filter-input"
              @press-enter="handleSearch"
            >
              <template #prefix><UserOutlined class="filter-input__icon" /></template>
            </a-input>
          </div>

          <div class="filter-field">
            <label class="filter-label">操作模块</label>
            <a-select
              v-model:value="query.module"
              placeholder="全部模块"
              allow-clear
              class="filter-select"
            >
              <a-select-option value="报销单">报销单</a-select-option>
              <a-select-option value="审批">审批</a-select-option>
              <a-select-option value="项目">项目</a-select-option>
              <a-select-option value="组织架构">组织架构</a-select-option>
              <a-select-option value="系统">系统</a-select-option>
              <a-select-option value="OCR">OCR</a-select-option>
            </a-select>
          </div>

          <div class="filter-field">
            <label class="filter-label">操作动作</label>
            <a-select
              v-model:value="query.action"
              placeholder="全部动作"
              allow-clear
              class="filter-select"
            >
              <a-select-option value="CREATE">CREATE</a-select-option>
              <a-select-option value="UPDATE">UPDATE</a-select-option>
              <a-select-option value="DELETE">DELETE</a-select-option>
              <a-select-option value="APPROVE">APPROVE</a-select-option>
              <a-select-option value="REJECT">REJECT</a-select-option>
              <a-select-option value="SUBMIT">SUBMIT</a-select-option>
              <a-select-option value="LOGIN">LOGIN</a-select-option>
            </a-select>
          </div>

          <div class="filter-field filter-field--wide">
            <label class="filter-label">日期范围</label>
            <a-range-picker
              v-model:value="query.dateRange"
              value-format="YYYY-MM-DD"
              class="filter-rangepicker"
            />
          </div>
        </div>

        <div class="filter-actions">
          <a-button type="primary" class="btn-search" @click="handleSearch">
            <SearchOutlined />
            查询
          </a-button>
          <a-button class="btn-reset" @click="handleReset">
            <ReloadOutlined />
            重置
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- Table Card -->
    <a-card class="table-card animate-fade-in-up" style="animation-delay: 0.1s">
      <a-table
        :data-source="tableData"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1200 }"
        class="log-table"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 操作时间 -->
          <template v-if="column.dataIndex === 'createdAt'">
            <div class="cell-time">
              <ClockCircleOutlined class="cell-time__icon" />
              <span class="cell-time__text">{{ formatTime(record.createdAt) }}</span>
            </div>
          </template>

          <!-- 模块 -->
          <template v-else-if="column.dataIndex === 'module'">
            <span class="module-badge" :class="`module-badge--${moduleKeyMap[record.module] || 'default'}`">
              {{ record.module }}
            </span>
          </template>

          <!-- 动作 -->
          <template v-else-if="column.dataIndex === 'action'">
            <span class="action-badge" :class="`action-badge--${record.action?.toLowerCase() || 'default'}`">
              {{ record.action }}
            </span>
          </template>

          <!-- 耗时：进度条 + 颜色 -->
          <template v-else-if="column.dataIndex === 'durationMs'">
            <div v-if="record.durationMs != null" class="duration-cell">
              <div class="duration-bar-wrap">
                <div
                  class="duration-bar"
                  :class="getDurationClass(record.durationMs)"
                  :style="{ width: getDurationBarWidth(record.durationMs) }"
                />
              </div>
              <span class="duration-val" :class="getDurationClass(record.durationMs)">
                {{ record.durationMs }} ms
              </span>
            </div>
            <span v-else class="cell-empty">—</span>
          </template>

          <!-- 状态 -->
          <template v-else-if="column.dataIndex === 'status'">
            <span class="status-pill" :class="record.status === 1 ? 'status-pill--ok' : 'status-pill--err'">
              <CheckCircleOutlined v-if="record.status === 1" />
              <CloseCircleOutlined v-else />
              {{ record.status === 1 ? '成功' : '失败' }}
            </span>
          </template>

          <!-- 描述 -->
          <template v-else-if="column.dataIndex === 'description'">
            <span class="desc-text" :title="record.description">{{ record.description }}</span>
          </template>

          <!-- 操作 -->
          <template v-else-if="column.dataIndex === 'opAction'">
            <button class="btn-detail" @click="openDetail(record as OperationLogVO)">
              <EyeOutlined />
              详情
            </button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Detail Modal -->
    <a-modal
      v-model:open="detailVisible"
      width="720px"
      :footer="null"
      class="log-detail-modal"
    >
      <template #title>
        <div class="modal-title-row">
          <span class="modal-title-icon"><FileSearchOutlined /></span>
          <span>操作日志详情</span>
        </div>
      </template>

      <div v-if="detailRecord" class="detail-body">
        <!-- Meta row -->
        <div class="detail-meta-row">
          <div class="detail-meta-item">
            <span class="detail-meta-label">操作时间</span>
            <span class="detail-meta-val detail-mono">{{ formatTime(detailRecord.createdAt) }}</span>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">IP 地址</span>
            <span class="detail-meta-val detail-mono">{{ detailRecord.ipAddress || '—' }}</span>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">执行状态</span>
            <span class="status-pill" :class="detailRecord.status === 1 ? 'status-pill--ok' : 'status-pill--err'">
              <CheckCircleOutlined v-if="detailRecord.status === 1" />
              <CloseCircleOutlined v-else />
              {{ detailRecord.status === 1 ? '成功' : '失败' }}
            </span>
          </div>
        </div>

        <!-- Fields grid -->
        <div class="detail-grid">
          <div class="detail-field">
            <span class="detail-field__label">操作人</span>
            <span class="detail-field__val">{{ detailRecord.userName }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">用户 ID</span>
            <span class="detail-field__val detail-mono">{{ detailRecord.userId }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">操作模块</span>
            <span class="module-badge" :class="`module-badge--${moduleKeyMap[detailRecord.module] || 'default'}`">
              {{ detailRecord.module }}
            </span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">操作动作</span>
            <span class="action-badge" :class="`action-badge--${detailRecord.action?.toLowerCase() || 'default'}`">
              {{ detailRecord.action }}
            </span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">目标类型</span>
            <span class="detail-field__val">{{ detailRecord.targetType || '—' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">目标 ID</span>
            <span class="detail-field__val detail-mono">{{ detailRecord.targetId ?? '—' }}</span>
          </div>
          <div class="detail-field detail-field--full">
            <span class="detail-field__label">目标编号</span>
            <span class="detail-field__val detail-mono">{{ detailRecord.targetNo || '—' }}</span>
          </div>
          <div class="detail-field detail-field--full">
            <span class="detail-field__label">操作描述</span>
            <span class="detail-field__val">{{ detailRecord.description || '—' }}</span>
          </div>

          <!-- HTTP row -->
          <div class="detail-field">
            <span class="detail-field__label">请求方法</span>
            <span :class="`method-badge method-badge--${detailRecord.requestMethod?.toLowerCase()}`">
              {{ detailRecord.requestMethod || '—' }}
            </span>
          </div>
          <div class="detail-field">
            <span class="detail-field__label">耗时</span>
            <div v-if="detailRecord.durationMs != null" class="duration-cell">
              <div class="duration-bar-wrap">
                <div
                  class="duration-bar"
                  :class="getDurationClass(detailRecord.durationMs)"
                  :style="{ width: getDurationBarWidth(detailRecord.durationMs) }"
                />
              </div>
              <span class="duration-val" :class="getDurationClass(detailRecord.durationMs)">
                {{ detailRecord.durationMs }} ms
              </span>
            </div>
            <span v-else class="cell-empty">—</span>
          </div>

          <div class="detail-field detail-field--full">
            <span class="detail-field__label">请求 URL</span>
            <code class="detail-code detail-code--url">{{ detailRecord.requestUrl || '—' }}</code>
          </div>
          <div class="detail-field detail-field--full">
            <span class="detail-field__label">User-Agent</span>
            <code class="detail-code detail-code--ua">{{ detailRecord.userAgent || '—' }}</code>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import dayjs from 'dayjs'
import request from '@/utils/request'
import {
  FileSearchOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue'

interface OperationLogVO {
  id: number
  userId: number
  userName: string
  module: string
  action: string
  targetType: string
  targetId: number
  targetNo: string
  description: string
  requestMethod: string
  requestUrl: string
  userAgent: string
  ipAddress: string
  durationMs: number
  status: number
  createdAt: string
}

interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

const loading = ref(false)
const tableData = ref<OperationLogVO[]>([])
const detailVisible = ref(false)
const detailRecord = ref<OperationLogVO | null>(null)

const query = reactive({
  userName: '',
  module: undefined as string | undefined,
  action: undefined as string | undefined,
  dateRange: undefined as [string, string] | undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条`,
})

// module → CSS key
const moduleKeyMap: Record<string, string> = {
  报销单: 'reimbursement',
  审批: 'approval',
  项目: 'project',
  组织架构: 'org',
  系统: 'system',
  OCR: 'ocr',
}

const columns = [
  {
    title: '操作时间',
    dataIndex: 'createdAt',
    width: 185,
    fixed: 'left' as const,
  },
  {
    title: '操作人',
    dataIndex: 'userName',
    width: 100,
  },
  {
    title: '模块',
    dataIndex: 'module',
    width: 110,
    align: 'center' as const,
  },
  {
    title: '动作',
    dataIndex: 'action',
    width: 110,
    align: 'center' as const,
  },
  {
    title: '描述',
    dataIndex: 'description',
    ellipsis: true,
  },
  {
    title: 'IP 地址',
    dataIndex: 'ipAddress',
    width: 135,
  },
  {
    title: '耗时',
    dataIndex: 'durationMs',
    width: 160,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    align: 'center' as const,
  },
  {
    title: '操作',
    dataIndex: 'opAction',
    width: 85,
    align: 'center' as const,
    fixed: 'right' as const,
  },
]

function formatTime(val: string | undefined) {
  if (!val) return '—'
  return dayjs(val).format('YYYY-MM-DD HH:mm:ss')
}

function getDurationClass(ms: number | undefined) {
  if (ms == null) return ''
  if (ms >= 2000) return 'duration--slow'
  if (ms >= 500) return 'duration--warn'
  return 'duration--fast'
}

function getDurationBarWidth(ms: number | undefined): string {
  if (ms == null) return '0%'
  // Cap at 4000 ms for display
  const pct = Math.min((ms / 4000) * 100, 100)
  return `${pct}%`
}

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }
    if (query.userName) params.userName = query.userName
    if (query.module) params.module = query.module
    if (query.action) params.action = query.action
    if (query.dateRange?.[0]) params.startDate = query.dateRange[0]
    if (query.dateRange?.[1]) params.endDate = query.dateRange[1]

    const res = await request.get<PageResult<OperationLogVO>>(
      '/v1/system/operation-logs',
      { params },
    )
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } catch {
    // error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchData()
}

function handleReset() {
  query.userName = ''
  query.module = undefined
  query.action = undefined
  query.dateRange = undefined
  pagination.current = 1
  fetchData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

function openDetail(record: OperationLogVO) {
  detailRecord.value = record
  detailVisible.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="less">
// ── 页面容器 ──────────────────────────────────────────────────────────────────
.operation-logs {
  max-width: 1400px;
}

// ── 标题图标 ──────────────────────────────────────────────────────────────────
.page-title__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--primary-gradient);
  color: #fff;
  font-size: 17px;
  margin-right: 10px;
  vertical-align: middle;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.3);
}

// ── 筛选栏 ────────────────────────────────────────────────────────────────────
.filter-card {
  margin-bottom: var(--sp-5);
}

.filter-inner {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.filter-fields {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
  flex: 1;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--wide {
    flex: 1;
    min-width: 240px;
  }
}

.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.03em;
}

.filter-input {
  width: 165px;
}

.filter-input__icon {
  color: var(--text-tertiary);
  font-size: 13px;
}

.filter-select {
  width: 145px;
}

.filter-rangepicker {
  width: 100%;
  min-width: 240px;
}

.filter-actions {
  display: flex;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.btn-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

// ── 表格卡片 ──────────────────────────────────────────────────────────────────
.table-card {
  :deep(.ant-card-body) {
    padding: 0 !important;
  }
}

.log-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--bg-page) !important;
    font-size: 11px !important;
    color: var(--text-tertiary) !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
}

// ── 时间列 ────────────────────────────────────────────────────────────────────
.cell-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.cell-time__icon {
  color: var(--text-quaternary);
  font-size: 12px;
  flex-shrink: 0;
}

.cell-time__text {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.cell-empty {
  color: var(--text-quaternary);
}

// ── 模块徽章 ──────────────────────────────────────────────────────────────────
.module-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;

  &--reimbursement { background: rgba(79, 110, 247, 0.1); color: var(--primary); }
  &--approval      { background: rgba(245, 158, 11, 0.1); color: #d97706; }
  &--project       { background: rgba(34, 197, 94, 0.1);  color: #16a34a; }
  &--org           { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
  &--system        { background: rgba(100, 116, 139, 0.1);color: #475569; }
  &--ocr           { background: rgba(6, 182, 212, 0.1);  color: #0891b2; }
  &--default       { background: var(--bg-page); color: var(--text-secondary); }
}

// ── 动作徽章 ──────────────────────────────────────────────────────────────────
.action-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--r-sm);
  font-size: 11px;
  font-weight: 700;
  font-family: 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &--create  { background: rgba(34, 197, 94, 0.1);  color: #16a34a; border: 1px solid rgba(34,197,94,0.25); }
  &--update  { background: rgba(59, 130, 246, 0.1);  color: #2563eb; border: 1px solid rgba(59,130,246,0.25); }
  &--delete  { background: rgba(239, 68, 68, 0.1);   color: #dc2626; border: 1px solid rgba(239,68,68,0.25); }
  &--approve { background: rgba(34, 197, 94, 0.1);   color: #16a34a; border: 1px solid rgba(34,197,94,0.25); }
  &--reject  { background: rgba(239, 68, 68, 0.1);   color: #dc2626; border: 1px solid rgba(239,68,68,0.25); }
  &--submit  { background: rgba(245, 158, 11, 0.1);  color: #d97706; border: 1px solid rgba(245,158,11,0.25); }
  &--login   { background: rgba(139, 92, 246, 0.1);  color: #7c3aed; border: 1px solid rgba(139,92,246,0.25); }
  &--default { background: var(--bg-page); color: var(--text-secondary); border: 1px solid var(--border); }
}

// ── 耗时进度条 ────────────────────────────────────────────────────────────────
.duration-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-bar-wrap {
  flex: 1;
  height: 5px;
  background: var(--bg-page);
  border-radius: var(--r-full);
  overflow: hidden;
  min-width: 60px;
  max-width: 80px;
}

.duration-bar {
  height: 100%;
  border-radius: var(--r-full);
  transition: width 0.6s var(--ease-out);

  &.duration--fast { background: linear-gradient(90deg, #22c55e, #4ade80); }
  &.duration--warn { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
  &.duration--slow { background: linear-gradient(90deg, #ef4444, #f87171); }
}

.duration-val {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-family: 'SFMono-Regular', Consolas, monospace;
  white-space: nowrap;
  font-weight: 600;

  &.duration--fast { color: var(--success); }
  &.duration--warn { color: var(--warning); }
  &.duration--slow { color: var(--error); }
}

// ── 状态胶囊 ──────────────────────────────────────────────────────────────────
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 600;

  &--ok  { background: var(--success-bg); color: #16a34a; }
  &--err { background: var(--error-bg);   color: #dc2626; }
}

// ── 描述文本 ──────────────────────────────────────────────────────────────────
.desc-text {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
}

// ── 详情按钮 ──────────────────────────────────────────────────────────────────
.btn-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg-container);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);

  &:hover {
    background: var(--primary-bg-hover);
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(79, 110, 247, 0.15);
    transform: translateY(-1px);
  }
}

// ── 详情弹窗 ──────────────────────────────────────────────────────────────────
.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-md);
  background: var(--primary-gradient);
  color: #fff;
  font-size: 14px;
}

.detail-body {
  padding: 4px 0;
}

.detail-meta-row {
  display: flex;
  gap: var(--sp-5);
  padding: 14px 20px;
  background: var(--bg-page);
  border-radius: var(--r-lg);
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.detail-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-meta-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.detail-meta-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-mono {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  &--full {
    grid-column: 1 / -1;
  }
}

.detail-field__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-field__val {
  font-size: 13px;
  color: var(--text-primary);
}

// ── HTTP Method 徽章 ──────────────────────────────────────────────────────────
.method-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--r-sm);
  font-size: 11px;
  font-weight: 700;
  font-family: 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.06em;

  &--get    { background: rgba(34, 197, 94, 0.1);  color: #16a34a; border: 1px solid rgba(34,197,94,0.3); }
  &--post   { background: rgba(59, 130, 246, 0.1); color: #2563eb; border: 1px solid rgba(59,130,246,0.3); }
  &--put    { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245,158,11,0.3); }
  &--delete { background: rgba(239, 68, 68, 0.1);  color: #dc2626; border: 1px solid rgba(239,68,68,0.3); }
}

// ── 代码块 ───────────────────────────────────────────────────────────────────
.detail-code {
  display: block;
  padding: 8px 12px;
  border-radius: var(--r-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  line-height: 1.6;

  &--url {
    background: rgba(79, 110, 247, 0.05);
    color: var(--primary);
    border: 1px solid rgba(79, 110, 247, 0.15);
  }

  &--ua {
    background: var(--bg-page);
    color: var(--text-tertiary);
    border: 1px solid var(--border-light);
  }
}
</style>
