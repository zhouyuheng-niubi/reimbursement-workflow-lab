import { request } from '@/utils/request'
import type { ApprovalPendingItem, ApprovalRecord, PageResponse } from '@/types'

export function fetchPendingApprovals(params?: Record<string, unknown>) {
  return request<PageResponse<ApprovalPendingItem>>({
    url: '/v1/approvals/pending',
    data: params,
  })
}

export function fetchApprovalHistory(params?: Record<string, unknown>) {
  return request<PageResponse<ApprovalRecord>>({
    url: '/v1/approvals/history',
    data: params,
  })
}

export function fetchApprovalRecords(reimbursementId: number | string) {
  return request<ApprovalRecord[]>({
    url: `/v1/approvals/records/${reimbursementId}`,
  })
}

export function doApproval(reimbursementId: number | string, payload: { action: number; opinion?: string }) {
  return request<void>({
    url: `/v1/approvals/${reimbursementId}/approve`,
    method: 'POST',
    data: payload,
  })
}
