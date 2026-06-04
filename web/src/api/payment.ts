import request from '@/utils/request'
import type { PageResponse } from '@/types/api'

export interface PaymentListParams {
  page?: number
  pageSize?: number
  status?: string | number
  startDate?: string
  endDate?: string
  keyword?: string
}

export interface PaymentRecord {
  id: number | string
  paymentNo: string
  reimbursementTitle?: string
  paymentAmount: number
  payeeName?: string
  paymentMethod?: number
  paymentMethodLabel?: string
  status: number
  statusLabel?: string
  paymentAt?: string | null
  createdAt?: string
  payeeBankName?: string
  payeeBankAccount?: string
  reimbNo?: string
}

export interface PaymentSummaryParams {
  status?: string | number
  companyId?: string | number
  startDate?: string
  endDate?: string
  keyword?: string
}

export interface PaymentSummary {
  pendingCount: number
  pendingAmount: number
  paidCount: number
  paidAmount: number
  failedCount: number
  failedAmount: number
  refundedCount: number
  refundedAmount: number
  totalCount: number
  totalAmount: number
}

export interface ConfirmPaymentData {
  paymentMethod: number
  paymentBank?: string
  paymentAccount?: string
  transactionNo: string
  voucherNo?: string
  remark?: string
}

export function fetchPaymentList(params?: PaymentListParams) {
  return request.get<PageResponse<PaymentRecord>>('/v1/payments', { params })
}

export function fetchPaymentSummary(params?: PaymentSummaryParams) {
  return request.get<PaymentSummary>('/v1/payments/summary', { params })
}

export function confirmPayment(id: number | string, data: ConfirmPaymentData) {
  return request.post<void>(`/v1/payments/${id}/confirm`, data)
}

export function failPayment(id: number | string, params: { remark?: string }) {
  return request.post<void>(`/v1/payments/${id}/fail`, null, { params })
}

export function refundPayment(id: number | string, params: { remark?: string }) {
  return request.post<void>(`/v1/payments/${id}/refund`, null, { params })
}
