import type { MenuItem } from '@/types/api'

/**
 * 侧边栏菜单配置
 * 基于四大门户重构：员工门户、审批门户、财务门户、管理门户
 */
export const menuConfig: MenuItem[] = [
  {
    key: '/dashboard',
    title: '我的工作台',
    icon: 'HomeOutlined',
  },
  {
    key: 'employee-portal',
    title: '我要报销',
    icon: 'UserOutlined',
    children: [
      { key: '/invoice/ocr', title: '拍票识别' },
      { key: '/invoice/list', title: '我的发票夹' },
      { key: '/reimbursement/create', title: '新建报销' },
      { key: '/reimbursement/list', title: '我的报销' },
    ],
  },
  {
    key: 'approval-portal',
    title: '我要审批',
    icon: 'AuditOutlined',
    roles: ['APPROVER', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    children: [
      { key: '/approval/pending', title: '待我审批', badge: 'pending' },
    ],
  },
  {
    key: 'finance-portal',
    title: '我要付款',
    icon: 'AccountBookOutlined',
    roles: ['FINANCE', 'ADMIN', 'SUPER_ADMIN'],
    children: [
      { key: '/invoice/list?mode=finance', title: '发票台账' },
      { key: '/payment/list', title: '付款管理' },
    ],
  },
  {
    key: 'governance-portal',
    title: '治理配置',
    icon: 'SettingOutlined',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    children: [
      { key: '/approval/flow', title: '审批流程配置' },
      { key: '/system/config', title: '报销类型配置' },
      { key: '/system/dict', title: '字典管理' },
    ],
  },
  {
    key: 'insight-portal',
    title: '数据与日志',
    icon: 'ProjectOutlined',
    roles: ['FINANCE', 'ADMIN', 'SUPER_ADMIN'],
    children: [
      { key: '/organization', title: '组织架构' },
      { key: '/project/list', title: '项目管理' },
      { key: '/report/dashboard', title: '统计报表' },
      { key: '/system/logs', title: '操作日志' },
    ],
  },
]
