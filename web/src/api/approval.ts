import request from '@/utils/request'
import type { PageResponse } from '@/types/api'

export interface ApprovalListParams {
  page?: number
  pageSize?: number
  [key: string]: any
}

export interface ApprovalAction {
  action: 'approve' | 'reject' | string
  opinion?: string
  amount?: number
}

export interface ApprovalFlowData {
  name: string
  companyId?: number | string
  typeId?: number | string
  nodes?: any[]
  [key: string]: any
}

export function fetchPendingApprovals(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return request.get<PageResponse<any>>('/v1/approvals/pending', { params })
}

export function fetchApprovalHistory(params?: { page?: number; pageSize?: number; keyword?: string; startDate?: string; endDate?: string }) {
  return request.get<PageResponse<any>>('/v1/approvals/history', { params })
}

export function doApproval(reimbursementId: number | string, data: ApprovalAction) {
  return request.post<void>(`/v1/approvals/${reimbursementId}/approve`, data)
}

export function fetchApprovalFlows(params?: ApprovalListParams) {
  return request.get<PageResponse<any>>('/v1/approval-flows', { params })
}

export function fetchApprovalFlowDetail(id: number | string) {
  return request.get<any>(`/v1/approval-flows/${id}`)
}

export function createApprovalFlow(data: ApprovalFlowData) {
  return request.post<any>('/v1/approval-flows', data)
}

export function updateApprovalFlow(id: number | string, data: Partial<ApprovalFlowData>) {
  return request.put<any>(`/v1/approval-flows/${id}`, data)
}

export function deleteApprovalFlow(id: number | string) {
  return request.delete<void>(`/v1/approval-flows/${id}`)
}

export function enableApprovalFlow(id: number | string) {
  return request.post<void>(`/v1/approval-flows/${id}/enable`)
}

export function disableApprovalFlow(id: number | string) {
  return request.post<void>(`/v1/approval-flows/${id}/disable`)
}
