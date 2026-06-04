<template>
  <div class="system-config page-container">
    <!-- Page Header -->
    <div class="page-header animate-fade-in-up">
      <div>
        <h2 class="page-title">系统配置</h2>
      </div>
    </div>

    <!-- Config Card -->
    <a-card class="config-card animate-fade-in-up" style="animation-delay: 0.08s" :body-style="{ padding: 0 }">
      <a-tabs v-model:activeKey="activeTab" class="config-tabs" @change="handleTabChange">

        <!-- ── 报销类型 ── -->
        <a-tab-pane key="types">
          <template #tab>
            <span class="tab-label">
              <FileProtectOutlined class="tab-icon" />
              报销类型配置
            </span>
          </template>

          <div class="tab-content">
            <!-- Type Cards Grid -->
            <div v-if="!typeLoading" class="type-grid animate-stagger">
              <div
                v-for="item in typeList"
                :key="item.id"
                class="type-config-card"
              >
                <!-- Card accent line -->
                <div class="type-config-card__accent" />

                <div class="type-config-card__header">
                  <div class="type-config-card__icon-wrap">
                    <WalletOutlined />
                  </div>
                  <div class="type-config-card__meta">
                    <div class="type-config-card__name">{{ item.typeName }}</div>
                    <div class="type-config-card__id">ID #{{ item.id }}</div>
                  </div>
                  <span :class="['type-config-card__status', item.status === 1 ? 'type-config-card__status--on' : 'type-config-card__status--off']">
                    <span class="type-config-card__status-dot" />
                    {{ item.status === 1 ? '启用' : '停用' }}
                  </span>
                </div>

                <div class="type-config-card__body">
                  <div class="type-config-card__row">
                    <span class="type-config-card__label">单笔限额</span>
                    <span class="type-config-card__value type-config-card__value--amount">
                      <template v-if="item.maxAmount">
                        <span class="amount-currency">¥</span>{{ formatAmount(item.maxAmount) }}
                      </template>
                      <span v-else class="type-config-card__value--unlimited">不限</span>
                    </span>
                  </div>
                  <div class="type-config-card__row">
                    <span class="type-config-card__label">排序</span>
                    <span class="type-config-card__value">{{ item.sortOrder ?? 0 }}</span>
                  </div>
                </div>

                <div v-if="item.description" class="type-config-card__desc">
                  {{ item.description }}
                </div>
              </div>

              <div v-if="typeList.length === 0" class="type-grid__empty">
                <a-empty :description="null" />
              </div>
            </div>

            <!-- Loading skeleton -->
            <div v-else class="type-grid">
              <div v-for="n in 4" :key="n" class="type-config-card type-config-card--skeleton">
                <div class="skeleton-block skeleton-block--title" />
                <div class="skeleton-block skeleton-block--row" />
                <div class="skeleton-block skeleton-block--row skeleton-block--short" />
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- ── 费用类别 ── -->
        <a-tab-pane key="categories">
          <template #tab>
            <span class="tab-label">
              <TagsOutlined class="tab-icon" />
              费用类别配置
            </span>
          </template>

          <div class="tab-content">
            <!-- Filter Bar -->
            <div class="filter-bar">
              <div class="filter-bar__label">
                <FilterOutlined class="filter-bar__icon" />
                筛选报销类型
              </div>
              <a-select
                v-model:value="selectedTypeId"
                placeholder="请选择报销类型以查看其费用类别"
                class="filter-bar__select"
                :options="typeList"
                :field-names="{ label: 'typeName', value: 'id' }"
                allow-clear
                @change="loadCategories"
              />
            </div>

            <!-- Category Cards Grid -->
            <div v-if="selectedTypeId && !categoryLoading" class="category-grid animate-stagger">
              <div
                v-for="item in categoryList"
                :key="item.id"
                class="category-card"
              >
                <div class="category-card__left">
                  <div class="category-card__dot" />
                  <div>
                    <div class="category-card__name">{{ item.categoryName }}</div>
                    <div class="category-card__id">ID #{{ item.id }}  ·  排序 {{ item.sortOrder ?? 0 }}</div>
                  </div>
                </div>
                <span :class="['category-card__status', item.status === 1 ? 'category-card__status--on' : 'category-card__status--off']">
                  {{ item.status === 1 ? '启用' : '停用' }}
                </span>
              </div>

              <div v-if="categoryList.length === 0" class="category-grid__empty">
                <a-empty :description="null" />
              </div>
            </div>

            <!-- Loading skeleton -->
            <div v-else-if="categoryLoading" class="category-grid">
              <div v-for="n in 6" :key="n" class="category-card category-card--skeleton">
                <div class="skeleton-block skeleton-block--cat" />
              </div>
            </div>

            <!-- Not selected state -->
            <div v-else-if="!selectedTypeId" class="categories-empty-state">
              <div class="categories-empty-state__icon">
                <TagsOutlined />
              </div>
              <div class="categories-empty-state__title">请先选择报销类型</div>
            </div>
          </div>
        </a-tab-pane>

        <!-- ── 更多配置 ── -->
        <a-tab-pane key="more">
          <template #tab>
            <span class="tab-label">
              <SettingOutlined class="tab-icon" />
              更多配置
            </span>
          </template>

          <div class="tab-content">
            <div class="filter-bar filter-bar--config">
              <a-input
                v-model:value="configQuery.keyword"
                placeholder="配置键 / 配置名称"
                allow-clear
                class="config-filter-input"
                @press-enter="handleConfigSearch"
              >
                <template #prefix>
                  <SearchOutlined class="filter-bar__icon" />
                </template>
              </a-input>
              <a-select
                v-model:value="configQuery.configGroup"
                placeholder="全部分组"
                allow-clear
                class="filter-bar__select"
                :options="configGroupOptions"
                @change="handleConfigSearch"
              />
              <a-select
                v-model:value="configQuery.status"
                placeholder="全部状态"
                allow-clear
                class="filter-bar__select filter-bar__select--sm"
                @change="handleConfigSearch"
              >
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="0">停用</a-select-option>
              </a-select>
              <a-space>
                <a-button type="primary" @click="handleConfigSearch">查询</a-button>
                <a-button @click="resetConfigFilters">重置</a-button>
                <a-button type="primary" ghost @click="openConfigModal()">
                  <template #icon><PlusOutlined /></template>
                  新建配置
                </a-button>
              </a-space>
            </div>

            <div class="config-stats">
              <div class="config-stat-card">
                <div class="config-stat-card__label">当前配置数</div>
                <div class="config-stat-card__value">{{ configPagination.total }}</div>
              </div>
              <div class="config-stat-card">
                <div class="config-stat-card__label">已启用</div>
                <div class="config-stat-card__value">{{ configActiveCount }}</div>
              </div>
              <div class="config-stat-card">
                <div class="config-stat-card__label">系统内置</div>
                <div class="config-stat-card__value">{{ configSystemCount }}</div>
              </div>
            </div>

            <a-table
              :loading="configLoading"
              :data-source="configList"
              :pagination="false"
              row-key="id"
              class="config-table"
              :scroll="{ x: 980 }"
            >
              <a-table-column title="分组" data-index="configGroup" key="configGroup" width="140" />
              <a-table-column title="配置键" data-index="configKey" key="configKey" width="180" />
              <a-table-column title="名称" data-index="configName" key="configName" width="180" />
              <a-table-column title="配置值" data-index="configValue" key="configValue" width="220" ellipsis />
              <a-table-column title="类型" data-index="valueType" key="valueType" width="110" />
              <a-table-column title="状态" key="status" width="100">
                <template #default="{ record }">
                  <span :class="['category-card__status', record.status === 1 ? 'category-card__status--on' : 'category-card__status--off']">
                    {{ record.status === 1 ? '启用' : '停用' }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="属性" key="flags" width="140">
                <template #default="{ record }">
                  <div class="config-flags">
                    <span v-if="record.isSystem === 1" class="config-flag config-flag--system">系统</span>
                    <span v-if="record.isEncrypted === 1" class="config-flag config-flag--secure">加密</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="更新时间" data-index="updatedAt" key="updatedAt" width="180" />
              <a-table-column title="操作" key="action" width="140" fixed="right">
                <template #default="{ record }">
                  <a-space size="small">
                    <a-button type="link" size="small" @click="openConfigModal(record)">
                      <EditOutlined />
                      编辑
                    </a-button>
                    <a-popconfirm
                      v-if="record.isSystem !== 1"
                      title="确定删除该配置吗？"
                      @confirm="handleDeleteConfig(record.id)"
                    >
                      <a-button type="link" size="small" danger>
                        <DeleteOutlined />
                        删除
                      </a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </a-table-column>
            </a-table>

            <div class="pagination-wrap pagination-wrap--config">
              <a-pagination
                v-model:current="configPagination.current"
                v-model:page-size="configPagination.pageSize"
                :total="configPagination.total"
                :show-size-changer="true"
                :show-total="configPagination.showTotal"
                @change="handleConfigPageChange"
              />
            </div>
          </div>
        </a-tab-pane>

      </a-tabs>
    </a-card>

    <a-modal
      v-model:open="configModalVisible"
      :title="configForm.id ? '编辑系统配置' : '新建系统配置'"
      width="680px"
      :confirm-loading="configSaving"
      @ok="saveConfig"
      @cancel="configModalVisible = false"
      destroy-on-close
    >
      <a-form layout="vertical" class="config-modal-form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="配置分组" required>
              <a-input
                v-model:value="configForm.configGroup"
                :disabled="configFieldLocked"
                placeholder="例如：ocr / payment / approval"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="配置键" required>
              <a-input
                v-model:value="configForm.configKey"
                :disabled="configFieldLocked"
                placeholder="例如：primaryProvider"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="配置名称">
              <a-input
                v-model:value="configForm.configName"
                :disabled="configFieldLocked"
                placeholder="中文说明"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="值类型">
              <a-select
                v-model:value="configForm.valueType"
                :disabled="configFieldLocked"
                :options="configValueTypeOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="配置值">
          <a-textarea
            v-model:value="configForm.configValue"
            :rows="4"
            :placeholder="configForm.valueType === 'JSON' ? '请输入 JSON 字符串' : '请输入配置值'"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="状态">
              <a-select v-model:value="configForm.status">
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="0">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="configForm.sortOrder" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="加密存储">
              <a-select v-model:value="configForm.isEncrypted" :disabled="configFieldLocked">
                <a-select-option :value="0">否</a-select-option>
                <a-select-option :value="1">是</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="configForm.remark" :rows="3" placeholder="填写该配置的业务说明或注意事项" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  FileProtectOutlined,
  TagsOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'

const activeTab = ref<string | number>('types')
const typeList = ref<any[]>([])
const typeLoading = ref(false)
const categoryList = ref<any[]>([])
const categoryLoading = ref(false)
const selectedTypeId = ref<number | undefined>(undefined)
const configLoading = ref(false)
const configSaving = ref(false)
const configList = ref<any[]>([])
const currentConfigMeta = ref<any | null>(null)
const configModalVisible = ref(false)
const configQuery = reactive({
  keyword: '',
  configGroup: undefined as string | undefined,
  status: undefined as number | undefined,
})
const configPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: (total: number) => `共 ${total} 条`,
})
const configForm = reactive({
  id: undefined as number | undefined,
  configGroup: '',
  configKey: '',
  configValue: '',
  valueType: 'STRING',
  configName: '',
  isEncrypted: 0,
  status: 1,
  sortOrder: 0,
  remark: '',
})

const configValueTypeOptions = [
  { label: '字符串', value: 'STRING' },
  { label: '数字', value: 'NUMBER' },
  { label: '布尔', value: 'BOOLEAN' },
  { label: 'JSON', value: 'JSON' },
]

const configGroupOptions = computed(() =>
  Array.from(new Set(configList.value.map((item) => item.configGroup).filter(Boolean))).map((group) => ({
    label: group,
    value: group,
  })),
)

const configActiveCount = computed(() => configList.value.filter((item) => item.status === 1).length)
const configSystemCount = computed(() => configList.value.filter((item) => item.isSystem === 1).length)
const configFieldLocked = computed(() => currentConfigMeta.value?.isSystem === 1)

function formatAmount(val: number | null) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadTypes() {
  typeLoading.value = true
  try {
    typeList.value = await request.get<any[]>('/v1/reimbursement-types')
  } catch {} finally {
    typeLoading.value = false
  }
}

async function loadCategories(typeId?: any) {
  if (!typeId) {
    categoryList.value = []
    return
  }
  categoryLoading.value = true
  try {
    categoryList.value = await request.get<any[]>(`/v1/expense-categories?typeId=${typeId}`)
  } catch {} finally {
    categoryLoading.value = false
  }
}

function resetConfigForm() {
  configForm.id = undefined
  configForm.configGroup = ''
  configForm.configKey = ''
  configForm.configValue = ''
  configForm.valueType = 'STRING'
  configForm.configName = ''
  configForm.isEncrypted = 0
  configForm.status = 1
  configForm.sortOrder = 0
  configForm.remark = ''
  currentConfigMeta.value = null
}

async function loadSystemConfigs() {
  configLoading.value = true
  try {
    const data = await request.get<any>('/v1/system-configs', {
      params: {
        page: configPagination.current,
        pageSize: configPagination.pageSize,
        keyword: configQuery.keyword || undefined,
        configGroup: configQuery.configGroup || undefined,
        status: configQuery.status,
      },
    })
    configList.value = data?.list ?? []
    configPagination.total = data?.total ?? 0
  } catch {
    configList.value = []
  } finally {
    configLoading.value = false
  }
}

function handleConfigSearch() {
  configPagination.current = 1
  loadSystemConfigs()
}

function resetConfigFilters() {
  configQuery.keyword = ''
  configQuery.configGroup = undefined
  configQuery.status = undefined
  configPagination.current = 1
  loadSystemConfigs()
}

function handleConfigPageChange(page: number, pageSize: number) {
  configPagination.current = page
  configPagination.pageSize = pageSize
  loadSystemConfigs()
}

function openConfigModal(record?: any) {
  resetConfigForm()
  if (record) {
    currentConfigMeta.value = record
    configForm.id = record.id
    configForm.configGroup = record.configGroup ?? ''
    configForm.configKey = record.configKey ?? ''
    configForm.configValue = record.configValue ?? ''
    configForm.valueType = record.valueType ?? 'STRING'
    configForm.configName = record.configName ?? ''
    configForm.isEncrypted = record.isEncrypted ?? 0
    configForm.status = record.status ?? 1
    configForm.sortOrder = record.sortOrder ?? 0
    configForm.remark = record.remark ?? ''
  }
  configModalVisible.value = true
}

async function saveConfig() {
  if (!configForm.configGroup || !configForm.configKey) {
    message.warning('请先填写配置分组和配置键')
    return
  }
  configSaving.value = true
  const payload = {
    configGroup: configForm.configGroup,
    configKey: configForm.configKey,
    configValue: configForm.configValue,
    valueType: configForm.valueType,
    configName: configForm.configName,
    isEncrypted: configForm.isEncrypted,
    status: configForm.status,
    sortOrder: configForm.sortOrder,
    remark: configForm.remark,
  }
  try {
    if (configForm.id) {
      await request.put(`/v1/system-configs/${configForm.id}`, payload)
      message.success('系统配置已更新')
    } else {
      await request.post('/v1/system-configs', payload)
      message.success('系统配置已创建')
    }
    configModalVisible.value = false
    loadSystemConfigs()
  } finally {
    configSaving.value = false
  }
}

async function handleDeleteConfig(id: number) {
  await request.delete(`/v1/system-configs/${id}`)
  message.success('系统配置已删除')
  if (configList.value.length === 1 && configPagination.current > 1) {
    configPagination.current -= 1
  }
  loadSystemConfigs()
}

function handleTabChange(key: string | number) {
  if (key === 'types' && typeList.value.length === 0) {
    loadTypes()
  }
  if (key === 'more' && configList.value.length === 0) {
    loadSystemConfigs()
  }
}

onMounted(() => {
  loadTypes()
})
</script>

<style scoped lang="less">
.system-config {
  max-width: 1200px;
}

/* ── Config Card ── */
.config-card {
  border-radius: var(--r-xl) !important;
  overflow: hidden;
}

/* ── Tabs ── */
.config-tabs {
  :deep(.ant-tabs-nav) {
    padding: 0 20px;
    margin: 0;
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-page);
  }

  :deep(.ant-tabs-content-holder) {
    padding: 0;
  }
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.tab-icon {
  font-size: 14px;
}

/* ── Tab Content Wrapper ── */
.tab-content {
  padding: 24px;
}

/* ── Section Hint ── */
.section-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--primary-bg);
  border-radius: var(--r-md);
  margin-bottom: 20px;
  font-size: 13px;
  color: var(--primary-dark);
  border: 1px solid rgba(79, 110, 247, 0.12);
}

.section-hint__icon {
  font-size: 14px;
  color: var(--primary);
  flex-shrink: 0;
}

/* ── Type Cards Grid ── */
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.type-grid__empty {
  grid-column: 1 / -1;
  padding: 40px 0;
}

/* ── Type Config Card ── */
.type-config-card {
  position: relative;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: var(--r-lg);
  padding: 16px;
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-xs);

  &:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
    border-color: rgba(79, 110, 247, 0.15);

    .type-config-card__accent {
      opacity: 1;
    }
  }

  &--skeleton {
    pointer-events: none;
  }
}

.type-config-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary-gradient);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.type-config-card__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.type-config-card__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.type-config-card__meta {
  flex: 1;
  min-width: 0;
}

.type-config-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-config-card__id {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.type-config-card__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;

  &--on {
    color: var(--success);
    background: var(--success-bg);
  }

  &--off {
    color: var(--text-tertiary);
    background: var(--border-light);
  }
}

.type-config-card__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.type-config-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-page);
  border-radius: var(--r-md);
  margin-bottom: 12px;
}

.type-config-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-config-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.type-config-card__value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &--amount {
    color: var(--primary);
  }

  &--unlimited {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: 400;
  }
}

.amount-currency {
  font-size: 11px;
  font-weight: 400;
  margin-right: 1px;
}

.type-config-card__desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--bg-page);
  border: 1px solid var(--border-light);
  border-radius: var(--r-lg);
  margin-bottom: 20px;
}

.filter-bar__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-bar__icon {
  color: var(--primary);
}

.filter-bar__select {
  width: 280px;
}

.filter-bar--config {
  flex-wrap: wrap;
}

.config-filter-input {
  width: 260px;
}

.filter-bar__select--sm {
  width: 160px;
}

/* ── Category Grid ── */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.category-grid__empty {
  grid-column: 1 / -1;
  padding: 32px 0;
}

/* ── Category Card ── */
.category-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: var(--r-md);
  transition: all var(--duration-fast) var(--ease-out);
  box-shadow: var(--shadow-xs);

  &:hover {
    border-color: rgba(79, 110, 247, 0.2);
    background: var(--primary-bg);
    transform: translateX(2px);
  }

  &--skeleton {
    pointer-events: none;
    height: 56px;
  }
}

.category-card__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.category-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-gradient);
  flex-shrink: 0;
}

.category-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.category-card__id {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}

.category-card__status {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;

  &--on {
    color: var(--success);
    background: var(--success-bg);
  }

  &--off {
    color: var(--text-tertiary);
    background: var(--border-light);
  }
}

/* ── Categories Empty State ── */
.categories-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  text-align: center;
  margin-bottom: 20px;
}

.categories-empty-state__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--r-xl);
  background: var(--primary-bg);
  color: var(--primary);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  opacity: 0.7;
}

.categories-empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.categories-empty-state__desc {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.6;
  max-width: 300px;
}

/* ── Coming Soon ── */
.config-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.config-stat-card {
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 1) 100%);
  box-shadow: var(--shadow-xs);
}

.config-stat-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.config-stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.config-table {
  :deep(.ant-table-wrapper) {
    border-radius: var(--r-lg);
  }

  :deep(.ant-table) {
    border: 1px solid var(--border-light);
    border-radius: var(--r-lg);
    overflow: hidden;
  }
}

.config-flags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-flag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;

  &--system {
    color: var(--primary);
    background: var(--primary-bg);
  }

  &--secure {
    color: var(--warning);
    background: rgba(245, 158, 11, 0.12);
  }
}

.pagination-wrap--config {
  margin-top: 18px;
}

.config-modal-form {
  padding-top: 8px;
}

/* ── Config Notice ── */
.config-notice {
  border-radius: var(--r-md) !important;
  border: 1px solid rgba(59, 130, 246, 0.15) !important;
}

/* ── Skeleton Blocks ── */
.skeleton-block {
  background: linear-gradient(90deg, var(--border-light) 25%, #f8fafc 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--r-sm);
  height: 14px;
  margin-bottom: 10px;

  &--title {
    width: 55%;
    height: 16px;
  }

  &--row {
    width: 80%;
    height: 12px;
  }

  &--short {
    width: 45%;
  }

  &--cat {
    width: 70%;
    height: 12px;
    margin: 0;
  }
}

@media (max-width: 768px) {
  .config-stats {
    grid-template-columns: 1fr;
  }

  .config-filter-input,
  .filter-bar__select,
  .filter-bar__select--sm {
    width: 100%;
  }
}
</style>
