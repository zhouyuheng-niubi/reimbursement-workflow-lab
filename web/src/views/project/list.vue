<template>
  <div class="project-list animate-fade-in-up">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">项目管理</h2>
      </div>
      <div class="page-header__actions">
        <!-- View Toggle -->
        <div class="view-toggle">
          <button
            :class="['view-toggle-btn', viewMode === 'card' && 'view-toggle-btn--active']"
            @click="viewMode = 'card'"
            title="卡片视图"
          >
            <AppstoreOutlined />
          </button>
          <button
            :class="['view-toggle-btn', viewMode === 'table' && 'view-toggle-btn--active']"
            @click="viewMode = 'table'"
            title="表格视图"
          >
            <UnorderedListOutlined />
          </button>
        </div>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建项目
        </a-button>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="filter-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="8" :md="6">
          <a-input
            v-model:value="query.keyword"
            placeholder="项目编号/名称"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="6" :md="4">
          <a-select
            v-model:value="query.status"
            placeholder="项目状态"
            allow-clear
            style="width: 100%"
          >
            <a-select-option :value="0">筹备中</a-select-option>
            <a-select-option :value="1">进行中</a-select-option>
            <a-select-option :value="2">已完成</a-select-option>
            <a-select-option :value="3">已关闭</a-select-option>
          </a-select>
        </a-col>
        <a-col>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- Card View -->
    <template v-if="viewMode === 'card'">
      <div v-if="loading" class="card-loading">
        <a-spin size="large" />
      </div>
      <div v-else-if="tableData.length === 0" class="card-empty">
        <a-empty :description="null" />
      </div>
      <div v-else class="project-grid animate-stagger">
        <div
          v-for="item in tableData"
          :key="item.id"
          class="project-card"
        >
          <!-- Card Top Bar -->
          <div class="project-card__topbar" :style="{ background: getProjectGradient(item) }"></div>

          <!-- Card Header -->
          <div class="project-card__header">
            <div class="project-card__meta">
              <span class="project-card__code">{{ item.projectCode }}</span>
              <span :class="['proj-status-tag', `proj-status-tag--${item.status}`]">
                {{ statusLabelMap[item.status] }}
              </span>
            </div>
            <h3 class="project-card__name">{{ item.projectName }}</h3>
            <p class="project-card__company">
              <BankOutlined />
              {{ item.companyName || '—' }}
              <template v-if="item.departmentName">
                <span class="card-divider">·</span>
                {{ item.departmentName }}
              </template>
            </p>
          </div>

          <!-- Budget Progress -->
          <div class="project-card__budget">
            <div class="budget-header">
              <span class="budget-label">预算使用</span>
              <span class="budget-rate" :style="{ color: getBudgetColor(item) }">
                {{ getBudgetRate(item) }}%
              </span>
            </div>
            <div class="budget-track">
              <div
                class="budget-fill"
                :style="{
                  width: getBudgetRate(item) + '%',
                  background: getBudgetGradient(item)
                }"
              ></div>
            </div>
            <div class="budget-amounts">
              <span class="budget-used">已用 ¥{{ formatAmount(item.usedBudget) }}</span>
              <span class="budget-total">共 ¥{{ formatAmount(item.totalBudget) }}</span>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="project-card__footer">
            <div class="card-date">
              <CalendarOutlined />
              <span v-if="item.startDate">{{ item.startDate }} ~ {{ item.endDate || '进行中' }}</span>
              <span v-else class="text-muted">未设置Maintainer期</span>
            </div>
            <div class="card-actions">
              <a-button type="link" size="small" @click="openEditModal(item)">
                <EditOutlined />
              </a-button>
              <a-dropdown>
                <a-button type="link" size="small">
                  <EllipsisOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }: any) => handleStatusChange(item, key)">
                    <a-menu-item v-if="item.status !== 1" key="1">设为进行中</a-menu-item>
                    <a-menu-item v-if="item.status !== 2" key="2">设为已完成</a-menu-item>
                    <a-menu-item v-if="item.status !== 3" key="3">设为已关闭</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Pagination -->
      <div class="card-pagination" v-if="tableData.length > 0">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :show-quick-jumper="true"
          :show-total="(total: number) => `共 ${total} 个项目`"
          @change="(page: number, size: number) => { pagination.current = page; pagination.pageSize = size; fetchData() }"
        />
      </div>
    </template>

    <!-- Table View -->
    <template v-else>
      <div class="table-card">
        <a-table
          :data-source="tableData"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          @change="handleTableChange"
          :scroll="{ x: 1300 }"
          class="project-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'projectName'">
              <div class="table-project-name">
                <div class="table-project-dot" :style="{ background: getProjectGradient(record) }"></div>
                {{ record.projectName }}
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'totalBudget'">
              <span class="amount-text">¥{{ formatAmount(record.totalBudget) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'usedBudget'">
              <span>¥{{ formatAmount(record.usedBudget) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'budgetRate'">
              <div class="table-budget-cell">
                <div class="table-budget-track">
                  <div
                    class="table-budget-fill"
                    :style="{
                      width: getBudgetRate(record) + '%',
                      background: getBudgetGradient(record)
                    }"
                  ></div>
                </div>
                <span class="table-budget-pct" :style="{ color: getBudgetColor(record) }">
                  {{ getBudgetRate(record) }}%
                </span>
              </div>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <span :class="['proj-status-tag', `proj-status-tag--${record.status}`]">
                {{ statusLabelMap[record.status] }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'dateRange'">
              <span v-if="record.startDate" class="date-range-text">
                {{ record.startDate }} ~ {{ record.endDate || '—' }}
              </span>
              <span v-else class="text-muted">—</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <div class="table-actions">
                <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
                <a-dropdown>
                  <a-button type="link" size="small">
                    更多 <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="({ key }: any) => handleStatusChange(record, key)">
                      <a-menu-item v-if="record.status !== 1" key="1">设为进行中</a-menu-item>
                      <a-menu-item v-if="record.status !== 2" key="2">设为已完成</a-menu-item>
                      <a-menu-item v-if="record.status !== 3" key="3">设为已关闭</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalEditId ? '编辑项目' : '新建项目'"
      :confirm-loading="modalLoading"
      width="720px"
      @ok="handleModalSubmit"
      @cancel="handleModalCancel"
    >
      <a-form
        ref="modalFormRef"
        :model="modalForm"
        :rules="(modalRules as any)"
        layout="vertical"
        class="modal-form"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="项目编号" name="projectCode">
              <a-input v-model:value="modalForm.projectCode" placeholder="请输入项目编号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="项目名称" name="projectName">
              <a-input v-model:value="modalForm.projectName" placeholder="请输入项目名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属公司" name="companyId">
              <a-select
                v-model:value="modalForm.companyId"
                placeholder="请选择公司"
                :options="companyOptions"
                :field-names="{ label: 'companyName', value: 'id' }"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属部门" name="departmentId">
              <a-select
                v-model:value="modalForm.departmentId"
                placeholder="请选择部门"
                allow-clear
                :options="deptOptions"
                :field-names="{ label: 'name', value: 'id' }"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="总预算" name="totalBudget">
              <a-input-number
                v-model:value="modalForm.totalBudget"
                :min="0"
                :precision="2"
                placeholder="请输入总预算"
                style="width: 100%"
                :formatter="((v: string) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')) as any"
                :parser="((v: string) => v.replace(/¥\s?|(,*)/g, '')) as any"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="项目类型" name="projectType">
              <a-select v-model:value="modalForm.projectType" placeholder="请选择类型">
                <a-select-option value="1">内部项目</a-select-option>
                <a-select-option value="2">外部项目</a-select-option>
                <a-select-option value="3">研发项目</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="开始日期" name="startDate">
              <a-date-picker
                v-model:value="modalForm.startDate"
                placeholder="开始日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束日期" name="endDate">
              <a-date-picker
                v-model:value="modalForm.endDate"
                placeholder="结束日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="项目描述" name="description">
              <a-textarea
                v-model:value="modalForm.description"
                placeholder="请输入项目描述"
                :rows="3"
                :maxlength="500"
                show-count
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  DownOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  BankOutlined,
  CalendarOutlined,
  EditOutlined,
  EllipsisOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'

const loading = ref(false)
const tableData = ref<any[]>([])
const viewMode = ref<'card' | 'table'>('card')

const query = reactive({
  keyword: '',
  status: undefined as number | undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 12,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const statusLabelMap: Record<number, string> = {
  0: '筹备中',
  1: '进行中',
  2: '已完成',
  3: '已关闭',
}

const columns = [
  { title: '项目编号', dataIndex: 'projectCode', width: 120 },
  { title: '项目名称', dataIndex: 'projectName', width: 160, ellipsis: true },
  { title: '所属公司', dataIndex: 'companyName', width: 130, ellipsis: true },
  { title: '所属部门', dataIndex: 'departmentName', width: 110, ellipsis: true },
  { title: '负责人', dataIndex: 'leaderName', width: 90 },
  { title: '总预算', dataIndex: 'totalBudget', width: 120, align: 'right' as const },
  { title: '已用预算', dataIndex: 'usedBudget', width: 120, align: 'right' as const },
  { title: '使用率', dataIndex: 'budgetRate', width: 160 },
  { title: '状态', dataIndex: 'status', width: 90, align: 'center' as const },
  { title: '起止日期', dataIndex: 'dateRange', width: 200 },
  { title: '操作', dataIndex: 'action', width: 130, fixed: 'right' as const },
]

function formatAmount(val: number | null) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getBudgetRate(record: any) {
  if (!record.totalBudget || record.totalBudget === 0) return 0
  return Math.round(((record.usedBudget || 0) / record.totalBudget) * 100)
}

function getBudgetColor(record: any) {
  const rate = getBudgetRate(record)
  if (rate >= 80) return '#ef4444'
  if (rate >= 60) return '#f59e0b'
  return '#22c55e'
}

function getBudgetGradient(record: any) {
  const rate = getBudgetRate(record)
  if (rate >= 80) return 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)'
  if (rate >= 60) return 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
  return 'linear-gradient(90deg, #4f6ef7 0%, #22c55e 100%)'
}

// Returns a gradient per project based on its index/id for visual variety
const projectGradients = [
  'linear-gradient(135deg, #4f6ef7 0%, #7b93ff 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
]

function getProjectGradient(record: any) {
  const idx = (Number(record.id) || 0) % projectGradients.length
  return projectGradients[idx]
}

async function fetchData() {
  loading.value = true
  try {
    const res = await request.get<any>('/v1/projects', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: query.keyword || undefined,
        status: query.status,
      },
    })
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } catch {} finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchData()
}

function handleReset() {
  query.keyword = ''
  query.status = undefined
  pagination.current = 1
  fetchData()
}

function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

async function handleStatusChange(record: any, statusKey: string) {
  try {
    await request.put(`/v1/projects/${record.id}/status?status=${Number(statusKey)}`)
    message.success('状态已更新')
    fetchData()
  } catch {}
}

// Modal
const modalVisible = ref(false)
const modalLoading = ref(false)
const modalEditId = ref<number | null>(null)
const modalFormRef = ref<FormInstance>()
const companyOptions = ref<any[]>([])
const deptOptions = ref<any[]>([])

const modalForm = reactive({
  projectCode: '',
  projectName: '',
  projectType: undefined as string | undefined,
  companyId: undefined as number | undefined,
  departmentId: undefined as number | undefined,
  totalBudget: undefined as number | undefined,
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  description: '',
})

const modalRules = {
  projectCode: [{ required: true, message: '请输入项目编号', trigger: 'blur' }],
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
}

function openCreateModal() {
  modalEditId.value = null
  resetModalForm()
  modalVisible.value = true
}

function openEditModal(record: any) {
  modalEditId.value = record.id
  modalForm.projectCode = record.projectCode
  modalForm.projectName = record.projectName
  modalForm.companyId = record.companyId
  modalForm.departmentId = record.departmentId
  modalForm.totalBudget = record.totalBudget
  modalForm.startDate = record.startDate
  modalForm.endDate = record.endDate
  modalForm.description = record.description || ''
  modalForm.projectType = record.projectType
  modalVisible.value = true
}

function resetModalForm() {
  modalForm.projectCode = ''
  modalForm.projectName = ''
  modalForm.projectType = undefined
  modalForm.companyId = undefined
  modalForm.departmentId = undefined
  modalForm.totalBudget = undefined
  modalForm.startDate = undefined
  modalForm.endDate = undefined
  modalForm.description = ''
  modalFormRef.value?.clearValidate()
}

function handleModalCancel() {
  modalVisible.value = false
  resetModalForm()
}

async function handleModalSubmit() {
  try {
    await modalFormRef.value?.validate()
  } catch {
    return
  }

  modalLoading.value = true
  try {
    const body = { ...modalForm }
    if (modalEditId.value) {
      await request.put(`/v1/projects/${modalEditId.value}`, body)
      message.success('项目更新成功')
    } else {
      await request.post('/v1/projects', body)
      message.success('项目创建成功')
    }
    modalVisible.value = false
    resetModalForm()
    fetchData()
  } catch {} finally {
    modalLoading.value = false
  }
}

async function loadCompanies() {
  try {
    companyOptions.value = await request.get<any[]>('/v1/companies')
  } catch {}
}

async function loadDepartments(companyId: number) {
  try {
    const tree = await request.get<any[]>('/v1/departments', { params: { companyId } })
    deptOptions.value = flattenTree(tree)
  } catch {}
}

function flattenTree(nodes: any[], result: any[] = []): any[] {
  for (const node of nodes) {
    result.push({ id: node.id, name: '　'.repeat(node.level - 1) + node.name })
    if (node.children?.length) {
      flattenTree(node.children, result)
    }
  }
  return result
}

watch(() => modalForm.companyId, (val) => {
  if (val) {
    loadDepartments(val)
  } else {
    deptOptions.value = []
  }
  modalForm.departmentId = undefined
})

onMounted(() => {
  fetchData()
  loadCompanies()
})
</script>

<style scoped lang="less">
// ── Page ──────────────────────────────────────────────────────────────────────

.project-list {
  max-width: var(--page-max-width);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}

// ── View Toggle ───────────────────────────────────────────────────────────────

.view-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  border-radius: var(--r-md);
  padding: 3px;
  gap: 2px;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  font-size: 14px;

  &:hover {
    color: var(--primary);
    background: var(--primary-bg);
  }

  &--active {
    background: var(--bg-container);
    color: var(--primary);
    box-shadow: var(--shadow-xs);
  }
}

// ── Filter Card ───────────────────────────────────────────────────────────────

.filter-card {
  background: var(--bg-container);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  padding: 16px 20px;
  margin-bottom: var(--sp-5);
}

// ── Card Grid ─────────────────────────────────────────────────────────────────

.card-loading,
.card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  background: var(--bg-container);
  border-radius: var(--r-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: var(--sp-5);
}

// ── Project Card ──────────────────────────────────────────────────────────────

.project-card {
  background: var(--bg-container);
  border-radius: var(--r-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: default;
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);
    border-color: rgba(79, 110, 247, 0.12);
  }
}

.project-card__topbar {
  height: 4px;
  flex-shrink: 0;
}

.project-card__header {
  padding: 16px 16px 12px;
  flex: 1;
}

.project-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-card__code {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-page);
  padding: 2px 8px;
  border-radius: var(--r-full);
  border: 1px solid var(--border-light);
}

.project-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  letter-spacing: -0.01em;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-card__company {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;

  .anticon {
    font-size: 11px;
  }
}

.card-divider {
  color: var(--border);
  margin: 0 2px;
}

// ── Budget Progress ───────────────────────────────────────────────────────────

.project-card__budget {
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-page);
}

.budget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.budget-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.budget-rate {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.budget-track {
  height: 6px;
  background: var(--border-light);
  border-radius: var(--r-full);
  overflow: hidden;
  margin-bottom: 6px;
}

.budget-fill {
  height: 100%;
  border-radius: var(--r-full);
  transition: width 0.6s var(--ease-out);
  min-width: 4px;
}

.budget-amounts {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.budget-used {
  color: var(--text-secondary);
  font-weight: 500;
}

.budget-total {
  color: var(--text-tertiary);
}

// ── Card Footer ───────────────────────────────────────────────────────────────

.project-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border-light);
}

.card-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-tertiary);

  .anticon {
    font-size: 11px;
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0;

  :deep(.ant-btn-link) {
    padding: 4px 6px;
    height: auto;
    color: var(--text-tertiary);
    border-radius: var(--r-sm);
    transition: all var(--duration-fast) var(--ease-out);

    &:hover {
      color: var(--primary);
      background: var(--primary-bg);
    }
  }
}

// ── Card Pagination ───────────────────────────────────────────────────────────

.card-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 8px;
}

// ── Status Tags (Project) ─────────────────────────────────────────────────────

.proj-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &--0 {
    color: #64748b;
    background: #f1f5f9;
    &::before { background: #94a3b8; }
  }

  &--1 {
    color: #4f6ef7;
    background: rgba(79, 110, 247, 0.08);
    &::before {
      background: #4f6ef7;
      animation: statusPulse 2s ease-in-out infinite;
    }
  }

  &--2 {
    color: #16a34a;
    background: #f0fdf4;
    &::before { background: #22c55e; }
  }

  &--3 {
    color: #94a3b8;
    background: #f8fafc;
    &::before { background: #cbd5e1; }
  }
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}

// ── Table View ────────────────────────────────────────────────────────────────

.table-card {
  background: var(--bg-container);
  border-radius: var(--r-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.project-table {
  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--primary-bg) !important;
  }
}

.table-project-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.table-project-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.table-budget-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-budget-track {
  flex: 1;
  height: 6px;
  background: var(--border-light);
  border-radius: var(--r-full);
  overflow: hidden;
}

.table-budget-fill {
  height: 100%;
  border-radius: var(--r-full);
  min-width: 4px;
  transition: width 0.6s var(--ease-out);
}

.table-budget-pct {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

.date-range-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

// ── Shared ────────────────────────────────────────────────────────────────────

.amount-text {
  color: var(--primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.text-muted {
  color: var(--text-quaternary);
}

// ── Modal Form ────────────────────────────────────────────────────────────────

.modal-form {
  padding-top: 8px;

  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }
}
</style>
