// Global API response types

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp?: number
  traceId?: string
}

export interface PageResponse<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// Auth

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken?: string
  userInfo: UserInfo
}

// User

export interface UserInfo {
  id: number | string
  username: string
  realName: string
  email?: string
  phone?: string
  avatar?: string
  roles: string[]
  permissions: string[]
  departmentId?: number | string
  departmentName?: string
  companyId?: number | string
  companyName?: string
  createdAt?: string
}

// Reimbursement

export type ReimbursementStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled'

export interface ReimbursementItem {
  id: number | string
  code: string
  title: string
  type: string
  typeLabel?: string
  amount: number
  status: ReimbursementStatus
  statusLabel?: string
  applicantId: number | string
  applicantName: string
  departmentId?: number | string
  departmentName?: string
  projectId?: number | string
  projectName?: string
  submitTime?: string
  approveTime?: string
  payTime?: string
  remark?: string
  attachments?: Attachment[]
  approvalFlow?: ApprovalFlowNode[]
  createdAt: string
  updatedAt?: string
}

export interface Attachment {
  id: number | string
  name: string
  url: string
  size?: number
  type?: string
}

export interface ApprovalFlowNode {
  id: number | string
  step: number
  approverName: string
  approverId: number | string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  comment?: string
  operatedAt?: string
}

export interface ReimbursementQueryParams {
  current?: number
  size?: number
  keyword?: string
  status?: ReimbursementStatus
  type?: string
  startDate?: string
  endDate?: string
  applicantId?: number | string
  projectId?: number | string
  departmentId?: number | string
}

// Project

export interface Project {
  id: number | string
  code: string
  name: string
  description?: string
  managerId?: number | string
  managerName?: string
  budget?: number
  usedBudget?: number
  status: 'active' | 'closed' | 'archived'
  startDate?: string
  endDate?: string
  createdAt: string
}

// Organization

export interface Department {
  id: number | string
  code?: string
  name: string
  parentId?: number | string
  parentName?: string
  managerId?: number | string
  managerName?: string
  level: number
  sort?: number
  children?: Department[]
  createdAt?: string
}

// OCR Auto-fill
export interface AutoFillSuggestion {
  title?: string
  amount?: number
  categoryId?: number | string
  categoryCode?: string
  typeId?: number | string
  remark?: string
  expenseDate?: string
  vendorName?: string
  invoiceNo?: string
  invoiceCode?: string
  invoiceType?: string
  hasInvoice?: number
  ocrFilled?: number
  items?: AutoFillItem[]
}

export interface AutoFillItem {
  categoryId?: number | string
  description?: string
  amount?: number
  expenseDate?: string
  invoiceNo?: string
  vendorName?: string
}

// Payment
export interface PaymentRecord {
  id: number | string
  reimbursementId: number | string
  reimbursementCode?: string
  applicantName?: string
  amount: number
  status: number
  statusLabel?: string
  payMethod?: string
  transactionNo?: string
  payTime?: string
  remark?: string
  createdAt: string
}

// Notification
export interface NotificationItem {
  id: number | string
  title: string
  content?: string
  type: number
  typeLabel?: string
  bizType?: string
  bizId?: number | string
  isRead: number
  createdAt: string
}

// Menu
export interface MenuItem {
  key: string
  title: string
  icon?: string
  roles?: string[]
  badge?: string
  children?: MenuItem[]
}
