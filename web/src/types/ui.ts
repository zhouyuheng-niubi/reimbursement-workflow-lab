export type PortalKind =
  | 'workspace'
  | 'employee'
  | 'approval'
  | 'finance'
  | 'governance'
  | 'insight'

export type WorkstreamKind = 'reimbursement' | 'approval' | 'payment' | 'governance' | 'ocr'

export type ReimbursementStatusUI = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type PaymentStatusUI = 0 | 1 | 2 | 3

export type InvoiceScope = 'mine' | 'all'

export interface OcrProviderStatus {
  enabled: boolean
  provider: string
  providerLabel?: string
  fallbackProvider?: string
  fallbackProviderLabel?: string
  message?: string
}

export interface DashboardNextAction {
  key: string
  title: string
  description: string
  cta: string
  path: string
  tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate'
}

export interface TimelineItem {
  key: string | number
  title: string
  description?: string
  meta?: string
  status?: 'done' | 'current' | 'pending' | 'error'
}

export interface RiskNotice {
  title: string
  description?: string
  tone?: 'warning' | 'danger' | 'info' | 'success'
}
