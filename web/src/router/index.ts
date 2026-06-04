import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    requiresAuth?: boolean
    roles?: string[]
    portal?: 'workspace' | 'employee' | 'approval' | 'finance' | 'governance' | 'insight'
    section?: string
    taskHint?: string
    hideInMenu?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '我的工作台',
          icon: 'HomeOutlined',
          portal: 'workspace',
          section: 'today',
          taskHint: '先看你今天最可能要做的事，再进入对应门户继续推进。',
        },
      },
      {
        path: 'reimbursement/list',
        name: 'ReimbursementList',
        component: () => import('@/views/reimbursement/list.vue'),
        meta: {
          title: '我的报销',
          icon: 'FileTextOutlined',
          portal: 'employee',
          section: 'reimbursement-list',
          taskHint: '这里不是纯历史列表，而是继续推进草稿、审批中和被驳回单据的主入口。',
        },
      },
      {
        path: 'reimbursement/create',
        name: 'ReimbursementCreate',
        component: () => import('@/views/reimbursement/create.vue'),
        meta: {
          title: '新建报销',
          icon: 'PlusOutlined',
          portal: 'employee',
          section: 'reimbursement-create',
          taskHint: '先带发票，再补明细和收款信息，最后保存草稿或提交审批。',
        },
      },
      {
        path: 'reimbursement/:id',
        name: 'ReimbursementDetail',
        component: () => import('@/views/reimbursement/detail.vue'),
        meta: {
          title: '报销详情',
          portal: 'employee',
          section: 'reimbursement-detail',
          taskHint: '重点看当前状态、下一步动作、审批进度和付款进度。',
          hideInMenu: true,
        },
      },
      {
        path: 'invoice/ocr',
        name: 'InvoiceOcr',
        component: () => import('@/views/invoice/ocr.vue'),
        meta: {
          title: '拍票识别',
          icon: 'ScanOutlined',
          portal: 'employee',
          section: 'invoice-ocr',
          taskHint: '这是员工提单链的起点，识别后去确认、归档或直接发起报销。',
        },
      },
      {
        path: 'invoice/list',
        name: 'InvoiceList',
        component: () => import('@/views/invoice/list.vue'),
        meta: {
          title: '我的发票夹',
          icon: 'FolderOpenOutlined',
          portal: 'employee',
          section: 'invoice-folder',
          taskHint: '把可用发票集中管理，再带入新建报销；财务视角下会自动切换成发票台账。',
        },
      },
      {
        path: 'approval/pending',
        name: 'ApprovalPending',
        component: () => import('@/views/approval/pending.vue'),
        meta: {
          title: '待我审批',
          icon: 'CheckCircleOutlined',
          roles: ['APPROVER', 'DEPT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
          portal: 'approval',
          section: 'approval-pending',
          taskHint: '在一个界面里看清单据、发票、风险和审批记录，再做通过、驳回或转审。',
        },
      },
      {
        path: 'approval/flow',
        name: 'ApprovalFlow',
        component: () => import('@/views/approval/flow.vue'),
        meta: {
          title: '审批流程配置',
          icon: 'BranchesOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN'],
          portal: 'governance',
          section: 'approval-flow',
          taskHint: '这里是低频规则治理，不应打断员工和审批人的主链操作。',
        },
      },
      {
        path: 'project/list',
        name: 'ProjectList',
        component: () => import('@/views/project/list.vue'),
        meta: {
          title: '项目管理',
          icon: 'ProjectOutlined',
          portal: 'insight',
          section: 'project',
          taskHint: '统一维护项目、预算与归属，不作为员工提单第一入口。',
        },
      },
      {
        path: 'organization',
        name: 'Organization',
        component: () => import('@/views/organization/index.vue'),
        meta: {
          title: '组织架构',
          icon: 'ApartmentOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN'],
          portal: 'insight',
          section: 'organization',
          taskHint: '基础数据归到数据与日志层，避免高频用户误入。',
        },
      },
      {
        path: 'notification/list',
        name: 'NotificationList',
        component: () => import('@/views/notification/list.vue'),
        meta: {
          title: '消息中心',
          icon: 'BellOutlined',
          portal: 'workspace',
          section: 'notification',
          taskHint: '集中查看审批提醒、驳回提醒和付款通知，回到相应主链继续处理。',
        },
      },
      {
        path: 'payment/list',
        name: 'PaymentList',
        component: () => import('@/views/payment/list.vue'),
        meta: {
          title: '付款管理',
          icon: 'MoneyCollectOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN', 'FINANCE'],
          portal: 'finance',
          section: 'payment',
          taskHint: '围绕待付款池处理确认、失败和退款，不再混入员工视角的状态跟踪。',
        },
      },
      {
        path: 'report/dashboard',
        name: 'ReportDashboard',
        component: () => import('@/views/report/dashboard.vue'),
        meta: {
          title: '统计报表',
          icon: 'BarChartOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN', 'FINANCE'],
          portal: 'insight',
          section: 'report',
          taskHint: '从财务和管理视角看汇总、趋势和异常，不只是图表堆砌。',
        },
      },
      {
        path: 'system/logs',
        name: 'SystemLogs',
        component: () => import('@/views/system/logs.vue'),
        meta: {
          title: '操作日志',
          icon: 'FileSearchOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN'],
          portal: 'insight',
          section: 'logs',
          taskHint: '作为审计和追溯底座存在，不应出现在一线高频主导航里。',
        },
      },
      {
        path: 'system/dict',
        name: 'SystemDict',
        component: () => import('@/views/system/dict.vue'),
        meta: {
          title: '字典管理',
          icon: 'DatabaseOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN'],
          portal: 'governance',
          section: 'dict',
          taskHint: '集中维护系统字典与显示文案，不参与业务主链。',
        },
      },
      {
        path: 'system/config',
        name: 'SystemConfig',
        component: () => import('@/views/system/config.vue'),
        meta: {
          title: '报销类型配置',
          icon: 'SettingOutlined',
          roles: ['ADMIN', 'SUPER_ADMIN'],
          portal: 'governance',
          section: 'config',
          taskHint: '配置报销规则和类型，而不是员工日常操作入口。',
        },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: {
          title: '个人中心',
          icon: 'UserOutlined',
          portal: 'workspace',
          section: 'profile',
          taskHint: '维护个人资料、收款信息和消息设置，支撑报销和付款主链。',
        },
      },
      {
        path: 'help/guide',
        name: 'HelpGuide',
        component: () => import('@/views/help/guide.vue'),
        meta: {
          title: '操作说明',
          portal: 'workspace',
          section: 'help-guide',
          hideInMenu: true,
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (token) {
    const { useUserStore } = await import('@/stores/user')
    const userStore = useUserStore()

    // 确保用户信息已加载
    if (!userStore.userInfo) {
      try {
        await userStore.getUserInfo()
      } catch {
        userStore.logout()
        if (requiresAuth) {
          next({ path: '/login', query: { redirect: to.fullPath } })
        } else {
          next()
        }
        return
      }
    }

    if (to.path === '/login') {
      next({ path: '/dashboard' })
      return
    }

    // 权限校验：如果路由配置了 roles
    if (to.meta.roles && to.meta.roles.length > 0) {
      const userRoles = userStore.userInfo?.roles ?? []
      const hasRole = to.meta.roles.some((r: string) => userRoles.includes(r))
      if (!hasRole) {
        next({ path: '/dashboard' })
        return
      }
    }
  }

  next()
})

export default router
