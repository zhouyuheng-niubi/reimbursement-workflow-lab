import request from '@/utils/request'
import type { PageResponse } from '@/types/api'

export interface OcrResult {
  id?: number | string
  userId?: number | string
  reimbursementId?: number | string
  detailId?: number | string
  originalFileName?: string
  filePath?: string
  fileUrl?: string
  ocrProvider?: string
  recognitionStatus?: number
  confidence?: number
  invoiceType?: number
  invoiceCode?: string
  invoiceNo?: string
  invoiceDate?: string
  checkCode?: string
  buyerName?: string
  buyerTaxNo?: string
  sellerName?: string
  sellerTaxNo?: string
  totalAmount?: number
  taxAmount?: number
  amountWithTax?: number
  currency?: string
  verifyStatus?: number
  verifyAt?: string
  isDuplicate?: number
  duplicateReimbId?: number
  errorMessage?: string
  remark?: string
  createdAt?: string
  [key: string]: any
}

export interface InvoiceQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  invoiceType?: string | number
  verifyStatus?: string | number
  isDuplicate?: string | number
  mineOnly?: boolean
  startDate?: string
  endDate?: string
}

export interface OcrStatus {
  enabled: boolean
  provider: string
  providerLabel?: string
  primaryEngine?: string
  model?: string
  fallbackProvider?: string
  fallbackProviderLabel?: string
  fallbackEnabled?: boolean
  fallbackEngine?: string
  message?: string
}

export function recognizeInvoice(formData: FormData) {
  return request.post<OcrResult>('/v1/invoices/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function verifyInvoice(id: number | string) {
  return request.post<OcrResult>(`/v1/invoices/ocr/${id}/verify`)
}

export function queryInvoices(params?: InvoiceQueryParams) {
  return request.get<PageResponse<OcrResult>>('/v1/invoices', { params })
}

export function getInvoiceDetail(id: number | string) {
  return request.get<OcrResult>(`/v1/invoices/ocr/${id}`)
}

export function deleteInvoice(id: number | string) {
  return request.delete<void>(`/v1/invoices/${id}`)
}

export function getOcrStatus() {
  return request.get<OcrStatus>('/v1/invoices/ocr/status')
}
