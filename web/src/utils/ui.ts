import type { DashboardNextAction, PortalKind, ReimbursementStatusUI } from '@/types/ui'

export const portalLabels: Record<PortalKind, string> = {
  workspace: '我的工作台',
  employee: '我要报销',
  approval: '我要审批',
  finance: '我要付款',
  governance: '治理配置',
  insight: '数据与日志',
}

export const reimbursementStatusLabelMap: Record<ReimbursementStatusUI, string> = {
  0: '草稿',
  1: '待审批',
  2: '审批中',
  3: '已通过',
  4: '已驳回',
  5: '已撤回',
  6: '已付款',
  7: '已关闭',
}

export const reimbursementStatusToneMap: Record<ReimbursementStatusUI, 'default' | 'processing' | 'success' | 'error' | 'warning'> = {
  0: 'default',
  1: 'warning',
  2: 'processing',
  3: 'success',
  4: 'error',
  5: 'default',
  6: 'success',
  7: 'default',
}

export function getPrimaryPortal(roles: string[] = []): PortalKind {
  if (roles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role))) {
    return 'workspace'
  }
  if (roles.includes('FINANCE')) {
    return 'finance'
  }
  if (roles.some(role => ['APPROVER', 'DEPT_MANAGER'].includes(role))) {
    return 'approval'
  }
  return 'employee'
}

export function getPortalTaskHint(portal: PortalKind): string {
  const hints: Record<PortalKind, string> = {
    workspace: '先处理你今天最关键的待办，再进入对应门户继续推进。',
    employee: '从拍票、发票夹到提单，沿着一条连续主链完成报销。',
    approval: '在一个界面里看清单据、风险与历史，再做审批决策。',
    finance: '围绕待付款池完成确认、失败和退款，不混入员工跟踪动作。',
    governance: '低频治理功能统一下沉，避免打断业务主链。',
    insight: '基础数据、日志和报表在这里统一管理和追踪。',
  }
  return hints[portal]
}

export function buildEmployeeNextActions(): DashboardNextAction[] {
  return [
    {
      key: 'ocr',
      title: '先拍票识别',
      description: '上传发票图片或 PDF，确认 OCR 结果后再进入提单。',
      cta: '去拍票',
      path: '/invoice/ocr',
      tone: 'blue',
    },
    {
      key: 'draft',
      title: '继续未完成报销',
      description: '优先处理草稿和被驳回单据，避免链路中断。',
      cta: '看我的报销',
      path: '/reimbursement/list',
      tone: 'orange',
    },
    {
      key: 'invoice-folder',
      title: '整理发票夹',
      description: '把可用发票集中管理，再带入新建报销。',
      cta: '打开发票夹',
      path: '/invoice/list',
      tone: 'green',
    },
  ]
}
