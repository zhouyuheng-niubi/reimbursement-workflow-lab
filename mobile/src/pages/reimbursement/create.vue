<template>
  <view class="mobile-page mobile-page--tight">
    <view class="page-shell">
      <view class="page-hero">
        <view class="page-hero__eyebrow">新建报销</view>
        <view class="page-hero__title">新建报销</view>
      </view>

      <SectionCard title="已选发票">
        <view v-if="selectedInvoices.length" class="list-stack">
          <view v-for="item in selectedInvoices" :key="item.id" class="invoice-card">
            <view class="invoice-card__top">
              <text class="invoice-card__title">{{ item.sellerName || item.invoiceNo || '已选发票' }}</text>
              <text class="invoice-card__amount">¥{{ formatMoney(item.amountWithTax ?? item.totalAmount) }}</text>
            </view>
            <view class="invoice-card__meta">
              <text>{{ item.invoiceNo || '未识别票号' }}</text>
              <text>{{ formatDate(item.invoiceDate) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">未选择发票</view>
        <button class="ghost-btn" style="margin-top: 16rpx" @click="pickInvoices">选择发票</button>
      </SectionCard>

      <SectionCard title="报销信息">
        <view class="form-field">
          <text class="form-field__label">报销标题</text>
          <input v-model="form.title" class="input-box" placeholder="报销标题" />
        </view>
        <view class="form-field">
          <text class="form-field__label">报销类型</text>
          <picker :range="typeOptions" range-key="label" :value="typeIndex" @change="handleTypeChange">
            <view class="picker-box">{{ typeLabel }}</view>
          </picker>
        </view>
        <view class="form-field">
          <text class="form-field__label">费用类别</text>
          <picker :range="categoryOptions" range-key="label" :value="categoryIndex" @change="handleCategoryChange">
            <view class="picker-box">{{ categoryLabel }}</view>
          </picker>
        </view>
        <view v-if="!selectedInvoices.length" class="form-field">
          <text class="form-field__label">手工金额</text>
          <input v-model="manualAmount" class="input-box" type="digit" placeholder="金额" />
        </view>
        <view class="form-field">
          <text class="form-field__label">费用说明</text>
          <textarea v-model="manualDescription" class="textarea-box" auto-height placeholder="费用说明" />
        </view>
        <view class="form-field">
          <text class="form-field__label">备注</text>
          <textarea v-model="form.remark" class="textarea-box" auto-height placeholder="备注" />
        </view>
      </SectionCard>

      <SectionCard title="收款信息">
        <view class="info-list">
          <view class="info-row"><text>收款人</text><text>{{ userInfo.realName || '--' }}</text></view>
          <view class="info-row"><text>开户行</text><text>{{ userInfo.bankName || '--' }}</text></view>
          <view class="info-row"><text>银行账号</text><text>{{ userInfo.bankAccount || '--' }}</text></view>
        </view>
      </SectionCard>

      <view class="button-row">
        <button class="ghost-btn" :disabled="saving" @click="submit(true)">保存草稿</button>
        <button class="primary-btn" :disabled="saving" @click="submit(false)">
          {{ saving ? '提交中...' : '提交审批' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import SectionCard from '@/components/SectionCard.vue'
import { fetchExpenseCategories, fetchReimbursementTypes, createReimbursement } from '@/api/reimbursement'
import { useSession } from '@/composables/useSession'
import { formatDate, formatMoney } from '@/utils/format'
import type { ExpenseCategory, InvoiceRecord, ReimbursementCreatePayload, ReimbursementType, UserInfo } from '@/types'

const session = useSession()
const selectedInvoices = ref<InvoiceRecord[]>([])
const typeOptions = ref<Array<{ label: string; value: number | string }>>([])
const categoryOptions = ref<Array<{ label: string; value: number | string }>>([])
const typeIndex = ref(-1)
const categoryIndex = ref(-1)
const saving = ref(false)
const manualAmount = ref('')
const manualDescription = ref('')
const userInfo = reactive<Partial<UserInfo>>({})

const form = reactive({
  title: '',
  remark: '',
})

const typeLabel = computed(() => {
  if (typeIndex.value < 0) return '请选择报销类型'
  return typeOptions.value[typeIndex.value]?.label || '请选择报销类型'
})

const categoryLabel = computed(() => {
  if (categoryIndex.value < 0) return '请选择费用类别'
  return categoryOptions.value[categoryIndex.value]?.label || '请选择费用类别'
})

function readSelectedInvoices() {
  const raw = uni.getStorageSync('mobileSelectedInvoices')
  selectedInvoices.value = raw ? (JSON.parse(raw) as InvoiceRecord[]) : []
  if (!form.title && selectedInvoices.value.length) {
    const first = selectedInvoices.value[0]
    form.title = `报销-${first.sellerName || first.invoiceNo || '发票'}`
  }
}

async function loadBaseData() {
  if (!session.requireAuth()) {
    return
  }
  const [types, profile] = await Promise.all([
    fetchReimbursementTypes(),
    session.loadUserInfo(),
  ])
  typeOptions.value = (types ?? []).map((item: ReimbursementType) => ({
    label: item.typeName || item.name || String(item.code || item.id),
    value: item.id,
  }))
  Object.assign(userInfo, profile ?? {})
}

async function loadCategories(typeId?: number | string) {
  categoryIndex.value = -1
  if (!typeId) {
    categoryOptions.value = []
    return
  }
  const list = await fetchExpenseCategories(typeId)
  categoryOptions.value = (list ?? []).map((item: ExpenseCategory) => ({
    label: item.categoryName || item.name || `类别 ${item.id}`,
    value: item.id,
  }))
}

function handleTypeChange(event: any) {
  typeIndex.value = Number(event.detail.value)
  const typeId = typeOptions.value[typeIndex.value]?.value
  loadCategories(typeId)
}

function handleCategoryChange(event: any) {
  categoryIndex.value = Number(event.detail.value)
}

function pickInvoices() {
  uni.navigateTo({ url: '/pages/invoice/list?picker=1' })
}

function buildDetails(): ReimbursementCreatePayload['details'] {
  const categoryId = categoryOptions.value[categoryIndex.value]?.value
  if (!categoryId) {
    throw new Error('请先选择费用类别')
  }
  if (selectedInvoices.value.length) {
    return selectedInvoices.value.map((item) => ({
      categoryId,
      expenseDate: item.invoiceDate || new Date().toISOString().slice(0, 10),
      amount: Number(item.amountWithTax ?? item.totalAmount ?? 0),
      taxAmount: Number(item.taxAmount ?? 0),
      description: manualDescription.value || item.sellerName || item.invoiceNo || '发票报销',
      vendorName: item.sellerName,
      invoiceNo: item.invoiceNo,
      invoiceCode: item.invoiceCode,
      invoiceType: item.invoiceType,
      hasInvoice: 1,
      invoiceRecognitionId: item.id,
    }))
  }
  const amount = Number(manualAmount.value || 0)
  if (amount <= 0) {
    throw new Error('请输入有效的手工金额')
  }
  return [
    {
      categoryId,
      expenseDate: new Date().toISOString().slice(0, 10),
      amount,
      description: manualDescription.value || '移动端手工报销',
      hasInvoice: 0,
    },
  ]
}

async function submit(isDraft: boolean) {
  if (!form.title) {
    uni.showToast({ title: '请填写报销标题', icon: 'none' })
    return
  }
  if (typeIndex.value < 0) {
    uni.showToast({ title: '请选择报销类型', icon: 'none' })
    return
  }
  if (!isDraft && !userInfo.realName) {
    uni.showToast({ title: '提交前请先完善收款信息', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const payload: ReimbursementCreatePayload = {
      title: form.title,
      typeId: typeOptions.value[typeIndex.value].value,
      departmentId: userInfo.departmentId as number | string,
      remark: form.remark,
      payeeName: userInfo.realName,
      payeeBankName: userInfo.bankName,
      payeeBankAccount: userInfo.bankAccount,
      draft: isDraft,
      isDraft,
      details: buildDetails(),
    }
    const created = await createReimbursement(payload)
    uni.removeStorageSync('mobileSelectedInvoices')
    uni.showToast({ title: isDraft ? '草稿已保存' : '报销单已提交', icon: 'success' })
    uni.redirectTo({ url: `/pages/reimbursement/detail?id=${created.id}` })
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad(() => {
  readSelectedInvoices()
})

onShow(() => {
  loadBaseData()
  readSelectedInvoices()
})
</script>

<style scoped lang="scss">
.invoice-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fbff;
  border: 1rpx solid #e3eaf5;
}

.invoice-card__top,
.invoice-card__meta,
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 14rpx;
}

.invoice-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #10233f;
}

.invoice-card__amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #2f63e6;
}

.invoice-card__meta,
.info-row {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7a8aa2;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
</style>
