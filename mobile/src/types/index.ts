export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageResponse<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface UserInfo {
  id: number | string
  username: string
  realName: string
  roles: string[]
  permissions?: string[]
  companyId?: number | string
  companyName?: string
  departmentId?: number | string
  departmentName?: string
  phone?: string
  email?: string
  bankName?: string
  bankAccount?: string
  bankAccountName?: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken?: string
  userInfo: UserInfo
}

export interface OcrStatus {
  enabled: boolean
  provider: string
  providerLabel?: string
  primaryEngine?: string
  model?: string
  fallbackProvider?: string
  fallbackProviderLabel?: string
  message?: string
}

export interface InvoiceRecord {
  id: number | string
  invoiceNo?: string
  invoiceCode?: string
  invoiceDate?: string
  invoiceType?: number
  originalFileName?: string
  sellerName?: string
  buyerName?: string
  totalAmount?: number
  amountWithTax?: number
  taxAmount?: number
  verifyStatus?: number
  recognitionStatus?: number
  ocrProvider?: string
  confidence?: number
  isDuplicate?: number
  duplicateReimbId?: number
  reimbursementId?: number
  detailId?: number
  remark?: string
  createdAt?: string
  fileUrl?: string
}

export interface ReimbursementType {
  id: number | string
  typeName?: string
  name?: string
  code?: string
}

export interface ExpenseCategory {
  id: number | string
  categoryName?: string
  name?: string
  typeId?: number | string
}

export interface ReimbursementDetailItem {
  id?: number | string
  categoryId?: number | string
  categoryName?: string
  expenseDate?: string
  amount?: number
  taxAmount?: number
  description?: string
  vendorName?: string
  invoiceNo?: string
  invoiceCode?: string
  invoiceType?: number
  hasInvoice?: number
  invoiceRecognitionId?: number | string
}

export interface ApprovalRecord {
  id?: number | string
  reimbursementId?: number | string
  nodeOrder?: number
  nodeName?: string
  approverName?: string
  proxyApproverName?: string
  action?: number
  actionLabel?: string
  opinion?: string
  approvedAmount?: number
  actionAt?: string
  createdAt?: string
  durationMinutes?: number
}

export interface ReimbursementRecord {
  id: number | string
  reimbNo?: string
  title: string
  status?: number
  statusLabel?: string
  totalAmount?: number
  approvedAmount?: number
  typeName?: string
  companyName?: string
  departmentName?: string
  applicantName?: string
  projectName?: string
  currency?: string
  remark?: string
  payeeName?: string
  payeeBankName?: string
  payeeBankAccount?: string
  submitAt?: string
  approveAt?: string
  paymentAt?: string
  rejectReason?: string
  details?: ReimbursementDetailItem[]
  approvalRecords?: ApprovalRecord[]
}

export interface ReimbursementCreatePayload {
  title: string
  typeId: number | string
  departmentId: number | string
  projectId?: number | string
  remark?: string
  isDraft?: boolean
  draft?: boolean
  tripStartDate?: string
  tripEndDate?: string
  tripDestination?: string
  tripPurpose?: string
  payeeName?: string
  payeeBankName?: string
  payeeBankAccount?: string
  details: Array<{
    categoryId: number | string
    expenseDate: string
    amount: number
    taxAmount?: number
    description: string
    vendorName?: string
    invoiceNo?: string
    invoiceCode?: string
    invoiceType?: number
    hasInvoice?: number
    invoiceRecognitionId?: number | string
  }>
}

export interface ApprovalPendingItem {
  reimbursementId: number | string
  reimbNo?: string
  title?: string
  totalAmount?: number
  applicantName?: string
  departmentName?: string
  typeName?: string
  currentNodeName?: string
  totalNodes?: number
  submitAt?: string
  waitingDays?: number
}

export interface NotificationItem {
  id: number | string
  title: string
  content?: string
  type?: number
  typeLabel?: string
  bizType?: string
  bizId?: number | string
  isRead?: number
  createdAt?: string
}

export interface NotificationPage {
  list: NotificationItem[]
  total: number
  unreadCount: number
  page: number
  pageSize: number
}
