import { request } from '@/utils/request'
import type {
  ExpenseCategory,
  PageResponse,
  ReimbursementCreatePayload,
  ReimbursementRecord,
  ReimbursementType,
} from '@/types'

export function fetchReimbursementTypes() {
  return request<ReimbursementType[]>({ url: '/v1/reimbursement-types' })
}

export function fetchExpenseCategories(typeId?: number | string) {
  const query = typeId ? `?typeId=${typeId}` : ''
  return request<ExpenseCategory[]>({ url: `/v1/expense-categories${query}` })
}

export function fetchReimbursements(params?: Record<string, unknown>) {
  return request<PageResponse<ReimbursementRecord>>({
    url: '/v1/reimbursements',
    data: params,
  })
}

export function fetchReimbursementDetail(id: number | string) {
  return request<ReimbursementRecord>({
    url: `/v1/reimbursements/${id}`,
  })
}

export function createReimbursement(payload: ReimbursementCreatePayload) {
  return request<ReimbursementRecord>({
    url: '/v1/reimbursements',
    method: 'POST',
    data: payload,
  })
}

export function submitReimbursement(id: number | string) {
  return request<void>({
    url: `/v1/reimbursements/${id}/submit`,
    method: 'POST',
  })
}

export function withdrawReimbursement(id: number | string) {
  return request<void>({
    url: `/v1/reimbursements/${id}/withdraw`,
    method: 'POST',
  })
}
