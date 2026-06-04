import { request, upload } from '@/utils/request'
import type { InvoiceRecord, OcrStatus, PageResponse } from '@/types'

export function getOcrStatus() {
  return request<OcrStatus>({ url: '/v1/invoices/ocr/status' })
}

export function recognizeInvoice(filePath: string) {
  return upload<InvoiceRecord>({
    url: '/v1/invoices/ocr',
    filePath,
  })
}

export function verifyInvoice(id: number | string) {
  return request<InvoiceRecord>({
    url: `/v1/invoices/ocr/${id}/verify`,
    method: 'POST',
  })
}

export function queryInvoices(params?: Record<string, unknown>) {
  return request<PageResponse<InvoiceRecord>>({
    url: '/v1/invoices',
    data: params,
  })
}

export function deleteInvoice(id: number | string) {
  return request<void>({
    url: `/v1/invoices/${id}`,
    method: 'DELETE',
  })
}
