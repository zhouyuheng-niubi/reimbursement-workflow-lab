<template>
  <div class="dict-management page-container">
    <!-- Page Header -->
    <div class="page-header animate-fade-in-up">
      <div>
        <h2 class="page-title">字典管理</h2>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="dual-panel animate-fade-in-up" style="animation-delay: 0.08s">
      <!-- Left Panel: Dict Type List -->
      <div class="panel panel--left">
        <!-- Panel Header -->
        <div class="panel__header">
          <div class="panel__header-left">
            <div class="panel__icon">
              <BookOutlined />
            </div>
            <span class="panel__title">字典类型</span>
          </div>
          <a-button type="primary" size="small" class="panel__add-btn" @click="openTypeModal()">
            <template #icon><PlusOutlined /></template>
            新增
          </a-button>
        </div>

        <!-- Search -->
        <div class="panel__search">
          <a-input
            v-model:value="typeKeyword"
            placeholder="搜索类型名称或编码…"
            allow-clear
            class="search-input"
            @change="handleTypeSearch"
          >
            <template #prefix>
              <SearchOutlined class="search-icon" />
            </template>
          </a-input>
        </div>

        <!-- Type List -->
        <div class="type-list" v-if="!typeLoading">
          <div
            v-for="item in typeList"
            :key="item.id"
            class="type-item"
            :class="{ 'type-item--active': item.id === selectedType?.id }"
            @click="selectType(item)"
          >
            <div class="type-item__body">
              <div class="type-item__name-row">
                <span class="type-item__name">{{ item.dictTypeName }}</span>
                <a-tag v-if="item.isSystem" color="orange" class="type-item__sys-badge">系统</a-tag>
                <a-tag
                  :color="item.status === 1 ? 'success' : 'default'"
                  class="type-item__status-badge"
                >
                  {{ item.status === 1 ? '启用' : '停用' }}
                </a-tag>
              </div>
              <div class="type-item__code">{{ item.dictTypeCode }}</div>
            </div>
            <div class="type-item__actions" @click.stop>
              <a-tooltip title="编辑">
                <a-button type="text" size="small" class="type-item__action-btn" @click="openTypeModal(item)">
                  <EditOutlined />
                </a-button>
              </a-tooltip>
              <a-popconfirm
                v-if="!item.isSystem"
                title="确定删除该字典类型及其所有数据吗？"
                ok-text="删除"
                ok-type="danger"
                cancel-text="取消"
                @confirm="deleteType(item)"
              >
                <a-tooltip title="删除">
                  <a-button type="text" size="small" danger class="type-item__action-btn">
                    <DeleteOutlined />
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
              <a-tooltip v-else title="系统内置类型不可删除">
                <a-button type="text" size="small" disabled class="type-item__action-btn">
                  <DeleteOutlined />
                </a-button>
              </a-tooltip>
            </div>
            <!-- Active indicator bar -->
            <div class="type-item__indicator" />
          </div>

          <div v-if="typeList.length === 0" class="type-list__empty">
            <a-empty :description="null" :image-style="{ height: '40px' }" />
          </div>
        </div>

        <div v-else class="type-list type-list--loading">
          <div v-for="n in 5" :key="n" class="type-item-skeleton">
            <div class="skeleton-line skeleton-line--name" />
            <div class="skeleton-line skeleton-line--code" />
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="panel-divider">
        <div class="panel-divider__line" />
        <div class="panel-divider__dot" />
        <div class="panel-divider__line" />
      </div>

      <!-- Right Panel: Dict Data -->
      <div class="panel panel--right">
        <!-- Panel Header -->
        <div class="panel__header">
          <div class="panel__header-left">
            <div class="panel__icon panel__icon--secondary">
              <UnorderedListOutlined />
            </div>
            <div>
              <span class="panel__title">字典数据</span>
              <span v-if="selectedType" class="panel__title-meta">
                <span class="panel__title-sep">—</span>
                {{ selectedType.dictTypeName }}
                <span class="panel__code-badge">{{ selectedType.dictTypeCode }}</span>
              </span>
            </div>
          </div>
          <a-button
            type="primary"
            size="small"
            class="panel__add-btn"
            :disabled="!selectedType"
            @click="openDataModal()"
          >
            <template #icon><PlusOutlined /></template>
            新增数据
          </a-button>
        </div>

        <!-- Empty state when no type selected -->
        <div v-if="!selectedType" class="data-panel__empty">
          <div class="data-panel__empty-icon">
            <DatabaseOutlined />
          </div>
          <div class="data-panel__empty-title">请选择字典类型</div>
        </div>

        <!-- Dict Data Table -->
        <a-table
          v-else
          :data-source="dataList"
          :columns="dataColumns"
          :loading="dataLoading"
          :pagination="false"
          row-key="id"
          size="small"
          :scroll="{ x: 800, y: 520 }"
          class="data-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <span :class="['status-pill', record.status === 1 ? 'status-pill--on' : 'status-pill--off']">
                <span class="status-pill__dot" />
                {{ record.status === 1 ? '启用' : '停用' }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'isDefault'">
              <span v-if="record.isDefault === 1" class="default-badge">默认</span>
              <span v-else class="text-muted">—</span>
            </template>
            <template v-else-if="column.dataIndex === 'cssClass'">
              <code v-if="record.cssClass" class="css-class-preview">{{ record.cssClass }}</code>
              <span v-else class="text-muted">—</span>
            </template>
            <template v-else-if="column.dataIndex === 'dictExt'">
              <a-tooltip v-if="record.dictExt" :title="record.dictExt">
                <span class="ellipsis-text">{{ record.dictExt }}</span>
              </a-tooltip>
              <span v-else class="text-muted">—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="table-actions">
                <a-button type="link" size="small" @click="openDataModal(record as DictDataVO)">编辑</a-button>
                <a-popconfirm
                  title="确定删除该字典数据吗？"
                  ok-text="删除"
                  ok-type="danger"
                  cancel-text="取消"
                  @confirm="deleteData(record as DictDataVO)"
                >
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
          <template #emptyText>
            <a-empty :description="null" :image-style="{ height: '40px' }" />
          </template>
        </a-table>
      </div>
    </div>

    <!-- Dict Type Modal -->
    <a-modal
      v-model:open="typeModalOpen"
      :title="typeModalMode === 'add' ? '新增字典类型' : '编辑字典类型'"
      width="520px"
      :confirm-loading="typeSubmitting"
      @ok="submitTypeForm"
      @cancel="resetTypeForm"
    >
      <a-form
        ref="typeFormRef"
        :model="typeForm"
        :rules="typeFormRules as any"
        layout="vertical"
        class="modal-form"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="类型编码" name="dictTypeCode">
              <a-input
                v-model:value="typeForm.dictTypeCode"
                placeholder="如：gender、status"
                :disabled="typeModalMode === 'edit'"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="类型名称" name="dictTypeName">
              <a-input
                v-model:value="typeForm.dictTypeName"
                placeholder="如：性别、状态"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="typeForm.status">
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="0">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sortOrder">
              <a-input-number
                v-model:value="typeForm.sortOrder"
                :min="0"
                :max="9999"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="typeForm.remark"
            placeholder="可选备注说明"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Dict Data Modal -->
    <a-modal
      v-model:open="dataModalOpen"
      :title="dataModalMode === 'add' ? '新增字典数据' : '编辑字典数据'"
      width="580px"
      :confirm-loading="dataSubmitting"
      @ok="submitDataForm"
      @cancel="resetDataForm"
    >
      <a-form
        ref="dataFormRef"
        :model="dataForm"
        :rules="dataFormRules as any"
        layout="vertical"
        class="modal-form"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数据标签" name="dictLabel">
              <a-input
                v-model:value="dataForm.dictLabel"
                placeholder="显示文字，如：男"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据键值" name="dictValue">
              <a-input
                v-model:value="dataForm.dictValue"
                placeholder="存储值，如：1"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="CSS样式" name="cssClass">
              <a-select
                v-model:value="dataForm.cssClass"
                placeholder="可选标签颜色"
                allow-clear
              >
                <a-select-option value="success">success（绿色）</a-select-option>
                <a-select-option value="processing">processing（蓝色）</a-select-option>
                <a-select-option value="warning">warning（橙色）</a-select-option>
                <a-select-option value="error">error（红色）</a-select-option>
                <a-select-option value="default">default（灰色）</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="扩展信息" name="dictExt">
              <a-input
                v-model:value="dataForm.dictExt"
                placeholder="可选 JSON 或其他扩展"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="dataForm.status">
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="0">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="是否默认" name="isDefault">
              <a-select v-model:value="dataForm.isDefault">
                <a-select-option :value="0">否</a-select-option>
                <a-select-option :value="1">是</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序" name="sortOrder">
              <a-input-number
                v-model:value="dataForm.sortOrder"
                :min="0"
                :max="9999"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="dataForm.remark"
            placeholder="可选备注说明"
            :rows="2"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  BookOutlined,
  UnorderedListOutlined,
  DatabaseOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'

// ---- Types ----------------------------------------------------------------

interface DictTypeVO {
  id: number
  dictTypeCode: string
  dictTypeName: string
  status: number
  isSystem: number
  sortOrder: number
  remark: string
  createdAt: string
}

interface DictDataVO {
  id: number
  dictTypeId: number
  dictTypeCode: string
  dictLabel: string
  dictValue: string
  dictExt: string
  cssClass: string
  isDefault: number
  status: number
  sortOrder: number
  remark: string
}

// ---- State ----------------------------------------------------------------

const typeKeyword = ref('')
const typeList = ref<DictTypeVO[]>([])
const typeListAll = ref<DictTypeVO[]>([])
const typeLoading = ref(false)

const selectedType = ref<DictTypeVO | null>(null)
const dataList = ref<DictDataVO[]>([])
const dataLoading = ref(false)

// ---- Columns --------------------------------------------------------------

const dataColumns = [
  { title: '标签', dataIndex: 'dictLabel', width: 100, ellipsis: true },
  { title: '键值', dataIndex: 'dictValue', width: 90, ellipsis: true },
  { title: '扩展', dataIndex: 'dictExt', width: 100, ellipsis: true },
  { title: 'CSS', dataIndex: 'cssClass', width: 90, ellipsis: true },
  { title: '默认', dataIndex: 'isDefault', width: 70, align: 'center' as const },
  { title: '状态', dataIndex: 'status', width: 80, align: 'center' as const },
  { title: '排序', dataIndex: 'sortOrder', width: 60, align: 'center' as const },
  { title: '操作', key: 'actions', width: 110, align: 'center' as const, fixed: 'right' as const },
]

// ---- Type Modal -----------------------------------------------------------

const typeModalOpen = ref(false)
const typeModalMode = ref<'add' | 'edit'>('add')
const typeSubmitting = ref(false)
const typeFormRef = ref()
const editingTypeId = ref<number | null>(null)

const typeForm = reactive({
  dictTypeCode: '',
  dictTypeName: '',
  status: 1,
  sortOrder: 0,
  remark: '',
})

const typeFormRules = {
  dictTypeCode: [
    { required: true, message: '请输入类型编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '编码只能包含小写字母、数字和下划线，且以字母开头', trigger: 'blur' },
    { max: 64, message: '编码不超过64个字符', trigger: 'blur' },
  ],
  dictTypeName: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { max: 100, message: '名称不超过100个字符', trigger: 'blur' },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function openTypeModal(record?: DictTypeVO) {
  if (record) {
    typeModalMode.value = 'edit'
    editingTypeId.value = record.id
    typeForm.dictTypeCode = record.dictTypeCode
    typeForm.dictTypeName = record.dictTypeName
    typeForm.status = record.status
    typeForm.sortOrder = record.sortOrder ?? 0
    typeForm.remark = record.remark ?? ''
  } else {
    typeModalMode.value = 'add'
    editingTypeId.value = null
    typeForm.dictTypeCode = ''
    typeForm.dictTypeName = ''
    typeForm.status = 1
    typeForm.sortOrder = 0
    typeForm.remark = ''
  }
  typeModalOpen.value = true
}

function resetTypeForm() {
  typeFormRef.value?.resetFields()
  typeModalOpen.value = false
}

async function submitTypeForm() {
  try {
    await typeFormRef.value.validate()
  } catch {
    return
  }
  typeSubmitting.value = true
  try {
    if (typeModalMode.value === 'add') {
      await request.post('/v1/dict-types', { ...typeForm })
      message.success('新增成功')
    } else {
      await request.put(`/v1/dict-types/${editingTypeId.value}`, { ...typeForm })
      message.success('更新成功')
    }
    typeModalOpen.value = false
    await loadTypes()
    if (typeModalMode.value === 'edit' && selectedType.value?.id === editingTypeId.value) {
      const updated = typeListAll.value.find(t => t.id === editingTypeId.value)
      if (updated) selectedType.value = updated
    }
  } catch {
    // request interceptor shows error
  } finally {
    typeSubmitting.value = false
  }
}

async function deleteType(record: DictTypeVO) {
  try {
    await request.delete(`/v1/dict-types/${record.id}`)
    message.success('删除成功')
    if (selectedType.value?.id === record.id) {
      selectedType.value = null
      dataList.value = []
    }
    await loadTypes()
  } catch {
    // handled
  }
}

// ---- Data Modal -----------------------------------------------------------

const dataModalOpen = ref(false)
const dataModalMode = ref<'add' | 'edit'>('add')
const dataSubmitting = ref(false)
const dataFormRef = ref()
const editingDataId = ref<number | null>(null)

const dataForm = reactive({
  dictTypeId: 0,
  dictTypeCode: '',
  dictLabel: '',
  dictValue: '',
  dictExt: '',
  cssClass: '',
  isDefault: 0,
  status: 1,
  sortOrder: 0,
  remark: '',
})

const dataFormRules = {
  dictLabel: [
    { required: true, message: '请输入数据标签', trigger: 'blur' },
    { max: 100, message: '标签不超过100个字符', trigger: 'blur' },
  ],
  dictValue: [
    { required: true, message: '请输入数据键值', trigger: 'blur' },
    { max: 200, message: '键值不超过200个字符', trigger: 'blur' },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  isDefault: [{ required: true, message: '请选择是否默认', trigger: 'change' }],
}

function openDataModal(record?: DictDataVO) {
  if (!selectedType.value) return
  if (record) {
    dataModalMode.value = 'edit'
    editingDataId.value = record.id
    dataForm.dictTypeId = record.dictTypeId
    dataForm.dictTypeCode = record.dictTypeCode
    dataForm.dictLabel = record.dictLabel
    dataForm.dictValue = record.dictValue
    dataForm.dictExt = record.dictExt ?? ''
    dataForm.cssClass = record.cssClass ?? ''
    dataForm.isDefault = record.isDefault ?? 0
    dataForm.status = record.status
    dataForm.sortOrder = record.sortOrder ?? 0
    dataForm.remark = record.remark ?? ''
  } else {
    dataModalMode.value = 'add'
    editingDataId.value = null
    dataForm.dictTypeId = selectedType.value.id
    dataForm.dictTypeCode = selectedType.value.dictTypeCode
    dataForm.dictLabel = ''
    dataForm.dictValue = ''
    dataForm.dictExt = ''
    dataForm.cssClass = ''
    dataForm.isDefault = 0
    dataForm.status = 1
    dataForm.sortOrder = 0
    dataForm.remark = ''
  }
  dataModalOpen.value = true
}

function resetDataForm() {
  dataFormRef.value?.resetFields()
  dataModalOpen.value = false
}

async function submitDataForm() {
  try {
    await dataFormRef.value.validate()
  } catch {
    return
  }
  dataSubmitting.value = true
  try {
    if (dataModalMode.value === 'add') {
      await request.post('/v1/dict-data', { ...dataForm })
      message.success('新增成功')
    } else {
      await request.put(`/v1/dict-data/${editingDataId.value}`, { ...dataForm })
      message.success('更新成功')
    }
    dataModalOpen.value = false
    await loadDictData(selectedType.value!.dictTypeCode)
  } catch {
    // handled
  } finally {
    dataSubmitting.value = false
  }
}

async function deleteData(record: DictDataVO) {
  try {
    await request.delete(`/v1/dict-data/${record.id}`)
    message.success('删除成功')
    await loadDictData(selectedType.value!.dictTypeCode)
  } catch {
    // handled
  }
}

// ---- Data Loading ---------------------------------------------------------

async function loadTypes() {
  typeLoading.value = true
  try {
    const res = await request.get<{ list: DictTypeVO[]; total: number }>(
      '/v1/dict-types?page=1&pageSize=200'
    )
    typeListAll.value = res.list ?? []
    applyTypeFilter()
  } catch {
    // handled
  } finally {
    typeLoading.value = false
  }
}

function applyTypeFilter() {
  const kw = typeKeyword.value.trim().toLowerCase()
  if (!kw) {
    typeList.value = typeListAll.value
  } else {
    typeList.value = typeListAll.value.filter(
      t =>
        t.dictTypeName.toLowerCase().includes(kw) ||
        t.dictTypeCode.toLowerCase().includes(kw)
    )
  }
}

function handleTypeSearch() {
  applyTypeFilter()
}

async function selectType(record: DictTypeVO) {
  selectedType.value = record
  await loadDictData(record.dictTypeCode)
}

async function loadDictData(typeCode: string) {
  dataLoading.value = true
  try {
    dataList.value = await request.get<DictDataVO[]>(`/v1/dict-data?typeCode=${typeCode}`)
  } catch {
    // handled
  } finally {
    dataLoading.value = false
  }
}

// ---- Init -----------------------------------------------------------------

onMounted(() => {
  loadTypes()
})
</script>

<style scoped lang="less">
.dict-management {
  max-width: 1400px;
}

/* ── Dual Panel Layout ── */
.dual-panel {
  display: flex;
  align-items: flex-start;
  gap: 0;
  background: var(--bg-container);
  border-radius: var(--r-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  min-height: 680px;
}

/* ── Panel Base ── */
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel--left {
  width: 300px;
  flex-shrink: 0;
  background: var(--bg-page);
  border-right: none;
}

.panel--right {
  flex: 1;
  min-width: 0;
  background: var(--bg-container);
}

/* ── Panel Header ── */
.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-container);
  flex-shrink: 0;
  gap: 8px;
}

.panel__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.panel__icon {
  width: 30px;
  height: 30px;
  border-radius: var(--r-md);
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.panel__icon--secondary {
  background: rgba(34, 197, 94, 0.08);
  color: var(--success);
}

.panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.panel__title-meta {
  font-weight: 400;
  font-size: 13px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 2px;
  flex-wrap: wrap;
}

.panel__title-sep {
  color: var(--text-quaternary);
}

.panel__code-badge {
  display: inline-block;
  padding: 1px 7px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: var(--r-full);
  font-size: 11px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-weight: 600;
  letter-spacing: 0;
}

.panel__add-btn {
  flex-shrink: 0;
}

/* ── Panel Search ── */
.panel__search {
  padding: 12px 14px;
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.search-input {
  :deep(.ant-input-prefix) {
    margin-right: 6px;
  }
}

.search-icon {
  color: var(--text-tertiary);
  font-size: 13px;
  transition: color var(--duration-fast) var(--ease-out);
}

:deep(.ant-input-affix-wrapper:focus-within) .search-icon,
:deep(.ant-input-affix-wrapper-focused) .search-icon {
  color: var(--primary);
}

/* ── Type List ── */
.type-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
}

.type-list__empty {
  padding: 40px 16px;
}

.type-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 10px 18px;
  margin: 2px 8px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  gap: 8px;

  &:hover {
    background: var(--bg-hover);
    transform: translateX(2px);
    box-shadow: var(--shadow-xs);

    .type-item__actions {
      opacity: 1;
    }
  }

  &--active {
    background: linear-gradient(135deg, rgba(79, 110, 247, 0.1) 0%, rgba(123, 147, 255, 0.06) 100%) !important;
    box-shadow: 0 2px 8px rgba(79, 110, 247, 0.12) !important;
    transform: translateX(3px) !important;

    .type-item__name {
      color: var(--primary);
      font-weight: 600;
    }

    .type-item__indicator {
      opacity: 1;
    }

    .type-item__actions {
      opacity: 1;
    }
  }
}

.type-item__indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--primary-gradient);
  border-radius: 0 3px 3px 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.type-item__body {
  flex: 1;
  min-width: 0;
}

.type-item__name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.type-item__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  transition: color var(--duration-fast) var(--ease-out);
  letter-spacing: -0.01em;
}

.type-item__sys-badge,
.type-item__status-badge {
  font-size: 10px;
  line-height: 16px;
  padding: 0 5px;
}

.type-item__code {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'SFMono-Regular', Consolas, monospace;
  letter-spacing: 0.02em;
}

.type-item__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.type-item__action-btn {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  border-radius: var(--r-sm) !important;
}

/* ── Skeleton Loading ── */
.type-list--loading {
  padding: 8px 8px;
}

.type-item-skeleton {
  padding: 12px 14px;
  margin: 2px 0;
}

.skeleton-line {
  background: linear-gradient(90deg, var(--border-light) 25%, #f8fafc 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--r-sm);
  height: 12px;
  margin-bottom: 6px;
}

.skeleton-line--name {
  width: 60%;
}

.skeleton-line--code {
  width: 40%;
  height: 10px;
  margin-bottom: 0;
}

/* ── Panel Divider ── */
.panel-divider {
  width: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  min-height: 680px;
}

.panel-divider__line {
  flex: 1;
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--border), transparent);
}

.panel-divider__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
  margin: 4px 0;
}

/* ── Data Panel Empty ── */
.data-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 40px;
  text-align: center;
}

.data-panel__empty-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--r-xl);
  background: var(--primary-bg);
  color: var(--primary);
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  opacity: 0.7;
}

.data-panel__empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.data-panel__empty-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.6;
  max-width: 260px;
}

/* ── Data Table ── */
.data-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--bg-page) !important;
  }
}

/* ── Status Pill ── */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 500;

  &--on {
    color: var(--success);
    background: var(--success-bg);
  }

  &--off {
    color: var(--text-tertiary);
    background: var(--border-light);
  }
}

.status-pill__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* ── Default Badge ── */
.default-badge {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--info);
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
}

/* ── Misc ── */
.text-muted {
  color: var(--text-quaternary);
}

.css-class-preview {
  font-size: 11px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: #7c3aed;
  background: #f5f3ff;
  padding: 1px 6px;
  border-radius: var(--r-sm);
}

.ellipsis-text {
  display: inline-block;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  font-size: 12px;
}

.modal-form {
  padding-top: 8px;
}
</style>
