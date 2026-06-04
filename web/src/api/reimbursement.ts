import request from '@/utils/request'
import type { PageResponse } from '@/types/api'

export interface ReimbursementListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  typeId?: number | string
  startDate?: string
  endDate?: string
  applicantId?: number | string
  projectId?: number | string
  departmentId?: number | string
}

export interface ReimbursementCreateData {
  title: string
  typeId: number | string
  categoryId?: number | string
  projectId?: number | string
  amount: number
  remark?: string
  details?: any[]
  attachmentIds?: (number | string)[]
}

export interface ReimbursementType {
  id: number | string
  code: string
  name: string
  description?: string
}

export interface ExpenseCategory {
  id: number | string
  name: string
  typeId: number | string
  typeName?: string
}

export function fetchReimbursementList(params?: ReimbursementListParams) {
  return request.get<PageResponse<any>>('/v1/reimbursements', { params })
}

export function fetchReimbursementDetail(id: number | string) {
  return request.get<any>(`/v1/reimbursements/${id}`)
}

export function createReimbursement(data: ReimbursementCreateData) {
  return request.post<any>('/v1/reimbursements', data)
}

export function updateReimbursement(id: number | string, data: Partial<ReimbursementCreateData>) {
  return request.put<any>(`/v1/reimbursements/${id}`, data)
}

export function deleteReimbursement(id: number | string) {
  return request.delete<void>(`/v1/reimbursements/${id}`)
}

export function submitReimbursement(id: number | string) {
  return request.post<void>(`/v1/reimbursements/${id}/submit`)
}

export function withdrawReimbursement(id: number | string) {
  return request.post<void>(`/v1/reimbursements/${id}/withdraw`)
}

export function fetchReimbursementTypes() {
  return request.get<ReimbursementType[]>('/v1/reimbursement-types')
}

export function fetchExpenseCategories(typeId?: number | string) {
  return request.get<ExpenseCategory[]>('/v1/expense-categories', {
    params: typeId !== undefined ? { typeId } : undefined,
  })
}
