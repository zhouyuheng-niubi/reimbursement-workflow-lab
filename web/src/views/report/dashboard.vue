<template>
  <div class="report-dashboard page-container">
    <!-- Page Hero Banner -->
    <div class="page-banner animate-fade-in-up">
      <div class="page-banner__content">
        <div class="page-banner__left">
          <div class="page-banner__badge">
            <BarChartOutlined />
            数据报表
          </div>
          <h2 class="page-title" style="color: #fff; margin-top: 8px">统计报表</h2>
        </div>
        <div class="page-banner__decoration">
          <div class="deco-circle deco-circle--1"></div>
          <div class="deco-circle deco-circle--2"></div>
          <div class="deco-circle deco-circle--3"></div>
        </div>
      </div>

      <!-- Inline filter row inside banner -->
      <div class="banner-filter">
        <div class="banner-filter__item">
          <span class="banner-filter__label">公司</span>
          <a-select
            v-model:value="filters.companyId"
            placeholder="全部公司"
            style="width: 160px"
            allow-clear
            class="banner-select"
            @change="handleFilterChange"
          >
            <a-select-option
              v-for="company in companyOptions"
              :key="company.value"
              :value="company.value"
            >
              {{ company.label }}
            </a-select-option>
          </a-select>
        </div>
        <div class="banner-filter__item">
          <span class="banner-filter__label">日期范围</span>
          <a-range-picker
            v-model:value="filters.dateRange"
            :placeholder="['开始日期', '结束日期']"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            class="banner-picker"
            @change="handleFilterChange"
          />
        </div>
        <a-space>
          <a-button type="primary" :loading="summaryLoading" class="banner-btn" @click="loadAllData">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button class="banner-btn-ghost" @click="handleReset">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
          <a-button class="banner-btn-ghost" :loading="exporting" @click="handleExport">
            <template #icon><DownloadOutlined /></template>
            导出 Excel
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- Summary Cards -->
    <a-spin :spinning="summaryLoading">
      <a-row :gutter="[16, 16]" class="stat-row animate-stagger">
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card stat-card--blue">
            <div class="stat-card__header">
              <div class="stat-card__icon" style="background: rgba(79,110,247,0.12)">
                <FileTextOutlined style="color: var(--primary); font-size: 20px" />
              </div>
              <div class="stat-card__trend stat-card__trend--up">
                <RiseOutlined />
              </div>
            </div>
            <div class="stat-card__label">报销总数</div>
            <div class="stat-card__value number-animate" style="color: var(--primary)">
              {{ summary.totalReimbursements }}
              <span class="stat-card__unit">笔</span>
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card stat-card--green">
            <div class="stat-card__header">
              <div class="stat-card__icon" style="background: rgba(34,197,94,0.12)">
                <DollarOutlined style="color: var(--success); font-size: 20px" />
              </div>
              <div class="stat-card__trend stat-card__trend--up">
                <RiseOutlined />
              </div>
            </div>
            <div class="stat-card__label">报销总金额</div>
            <div class="stat-card__value number-animate" style="color: var(--success)">
              <span class="stat-currency">¥</span>{{ formatAmount(summary.totalAmount) }}
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card stat-card--orange">
            <div class="stat-card__header">
              <div class="stat-card__icon" style="background: rgba(245,158,11,0.12)">
                <CheckCircleOutlined style="color: var(--warning); font-size: 20px" />
              </div>
              <div class="stat-card__trend stat-card__trend--up">
                <RiseOutlined />
              </div>
            </div>
            <div class="stat-card__label">已通过金额</div>
            <div class="stat-card__value number-animate" style="color: var(--warning)">
              <span class="stat-currency">¥</span>{{ formatAmount(summary.approvedAmount) }}
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card stat-card--purple">
            <div class="stat-card__header">
              <div class="stat-card__icon" style="background: rgba(139,92,246,0.12)">
                <ClockCircleOutlined style="color: #8b5cf6; font-size: 20px" />
              </div>
              <div class="stat-card__trend stat-card__trend--down">
                <FallOutlined />
              </div>
            </div>
            <div class="stat-card__label">平均审批天数</div>
            <div class="stat-card__value number-animate" style="color: #8b5cf6">
              {{ summary.averageApprovalDays.toFixed(1) }}
              <span class="stat-card__unit">天</span>
            </div>
          </div>
        </a-col>
      </a-row>
    </a-spin>

    <!-- Charts Row -->
    <a-row :gutter="[16, 16]" class="chart-row animate-fade-in-up" style="animation-delay: 0.15s">
      <!-- Monthly Trend Chart -->
      <a-col :xs="24" :lg="14">
        <a-card class="chart-card">
          <template #title>
            <div class="chart-card__title">
              <div class="chart-card__title-icon" style="background: rgba(79,110,247,0.1)">
                <LineChartOutlined style="color: var(--primary)" />
              </div>
              <span>月度趋势</span>
            </div>
          </template>
          <template #extra>
            <span class="chart-badge chart-badge--blue">折线 + 柱状</span>
          </template>
          <a-spin :spinning="summaryLoading">
            <div class="chart-container">
              <v-chart
                v-if="trendOption.series && (trendOption.series as any[]).length"
                :option="trendOption"
                autoresize
                class="echart"
              />
              <a-empty v-else :description="null" class="chart-empty" />
            </div>
          </a-spin>
        </a-card>
      </a-col>

      <!-- Category Pie Chart -->
      <a-col :xs="24" :lg="10">
        <a-card class="chart-card">
          <template #title>
            <div class="chart-card__title">
              <div class="chart-card__title-icon" style="background: rgba(139,92,246,0.1)">
                <PieChartOutlined style="color: #8b5cf6" />
              </div>
              <span>费用类别分布</span>
            </div>
          </template>
          <template #extra>
            <span class="chart-badge chart-badge--purple">金额占比</span>
          </template>
          <a-spin :spinning="categoryLoading">
            <div class="chart-container">
              <v-chart
                v-if="categoryOption.series && (categoryOption.series as any[])[0]?.data?.length"
                :option="categoryOption"
                autoresize
                class="echart"
              />
              <a-empty v-else :description="null" class="chart-empty" />
            </div>
          </a-spin>
        </a-card>
      </a-col>
    </a-row>

    <!-- Department Ranking Table -->
    <a-card class="section-card table-section animate-fade-in-up" style="animation-delay: 0.2s">
      <template #title>
        <div class="chart-card__title">
          <div class="chart-card__title-icon" style="background: rgba(6,182,212,0.1)">
            <ApartmentOutlined style="color: #06b6d4" />
          </div>
          <span>部门报销排行</span>
        </div>
      </template>
      <template #extra>
        <span class="chart-badge chart-badge--cyan">共 {{ deptData.length }} 个部门</span>
      </template>
      <a-table
        :columns="deptColumns"
        :data-source="deptData"
        :loading="deptLoading"
        row-key="departmentId"
        :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total: number) => `共 ${total} 条` }"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalAmount'">
            <span class="amount-cell">¥{{ formatAmount(record.totalAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'approvedAmount'">
            <span class="amount-cell amount-cell--approved">¥{{ formatAmount(record.approvedAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'budgetUsageRate'">
            <div class="progress-cell">
              <a-progress
                :percent="record.budgetUsageRate ?? 0"
                :stroke-color="getProgressColor(record.budgetUsageRate)"
                size="small"
                :format="((pct: number) => `${pct}%`) as any"
              />
            </div>
          </template>
          <template v-else-if="column.key === 'topCategory'">
            <a-tag v-if="record.topCategory" color="geekblue">{{ record.topCategory }}</a-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Project Expense Table -->
    <a-card class="section-card table-section animate-fade-in-up" style="animation-delay: 0.25s">
      <template #title>
        <div class="chart-card__title">
          <div class="chart-card__title-icon" style="background: rgba(34,197,94,0.1)">
            <ProjectOutlined style="color: var(--success)" />
          </div>
          <span>项目费用明细</span>
        </div>
      </template>
      <template #extra>
        <span class="chart-badge chart-badge--green">共 {{ projectData.length }} 个项目</span>
      </template>
      <a-table
        :columns="projectColumns"
        :data-source="projectData"
        :loading="projectLoading"
        row-key="projectId"
        :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total: number) => `共 ${total} 条` }"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalBudget'">
            <span class="amount-cell">¥{{ formatAmount(record.totalBudget) }}</span>
          </template>
          <template v-else-if="column.key === 'usedAmount'">
            <span class="amount-cell amount-cell--approved">¥{{ formatAmount(record.usedAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'budgetUsageRate'">
            <div class="progress-cell">
              <a-progress
                :percent="record.budgetUsageRate ?? 0"
                :stroke-color="getProgressColor(record.budgetUsageRate)"
                size="small"
                :format="((pct: number) => `${pct}%`) as any"
              />
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Employee Ranking Table -->
    <a-card class="section-card table-section animate-fade-in-up" style="animation-delay: 0.3s">
      <template #title>
        <div class="chart-card__title">
          <div class="chart-card__title-icon" style="background: rgba(245,158,11,0.1)">
            <UserOutlined style="color: var(--warning)" />
          </div>
          <span>员工报销排名</span>
        </div>
      </template>
      <template #extra>
        <span class="chart-badge chart-badge--orange">Top 20</span>
      </template>
      <a-table
        :columns="employeeColumns"
        :data-source="employeeData"
        :loading="employeeLoading"
        row-key="userId"
        :pagination="employeePagination"
        :scroll="{ x: 1000 }"
        @change="handleEmployeeTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalAmount'">
            <span class="amount-cell">¥{{ formatAmount(record.totalAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'approvedAmount'">
            <span class="amount-cell amount-cell--approved">¥{{ formatAmount(record.approvedAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'averageAmount'">
            <span class="amount-cell">¥{{ formatAmount(record.averageAmount) }}</span>
          </template>
          <template v-else-if="column.key === 'rejectedCount'">
            <a-tag v-if="record.rejectedCount > 0" color="red">{{ record.rejectedCount }}</a-tag>
            <span v-else class="text-success">0</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { TablePaginationConfig } from 'ant-design-vue'

// ECharts — tree-shaking imports
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  ApartmentOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyTrendItem {
  month: string
  count: number
  amount: number
}

interface SummaryData {
  totalReimbursements: number
  totalAmount: number
  approvedAmount: number
  averageApprovalDays: number
  monthlyTrend?: MonthlyTrendItem[]
}

interface CategoryItem {
  categoryId: number
  categoryName: string
  totalAmount: number
  count: number
}

interface DeptItem {
  departmentId: number
  departmentName: string
  count: number
  totalAmount: number
  approvedAmount: number
  budgetUsageRate: number
  topCategory: string
}

interface ProjectItem {
  projectId: number
  projectName: string
  projectCode: string
  totalBudget: number
  usedAmount: number
  budgetUsageRate: number
  reimbursementCount: number
}

interface EmployeeItem {
  userId: number
  realName: string
  departmentName: string
  count: number
  totalAmount: number
  approvedAmount: number
  rejectedCount: number
  averageAmount: number
}

interface OrgTreeNode {
  id: number
  name: string
  type: 'company' | 'department'
  children?: OrgTreeNode[] | null
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const defaultDateRange: [string, string] = [
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD'),
]

const filters = reactive<{
  companyId: number | undefined
  dateRange: [string, string]
}>({
  companyId: undefined,
  dateRange: [...defaultDateRange],
})

// ─── Loading states ───────────────────────────────────────────────────────────

const summaryLoading = ref(false)
const categoryLoading = ref(false)
const deptLoading = ref(false)
const projectLoading = ref(false)
const employeeLoading = ref(false)
const exporting = ref(false)

// ─── Data ─────────────────────────────────────────────────────────────────────

const summary = reactive<SummaryData>({
  totalReimbursements: 0,
  totalAmount: 0,
  approvedAmount: 0,
  averageApprovalDays: 0,
  monthlyTrend: [],
})

const categoryData = ref<CategoryItem[]>([])
const deptData = ref<DeptItem[]>([])
const projectData = ref<ProjectItem[]>([])
const employeeData = ref<EmployeeItem[]>([])
const companyOptions = ref<Array<{ label: string; value: number }>>([])

const employeePagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatAmount(val: number | undefined | null): string {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getProgressColor(rate: number | undefined): string {
  const r = rate ?? 0
  if (r >= 90) return '#ff4d4f'
  if (r >= 70) return '#fa8c16'
  return '#52c41a'
}

// ─── ECharts options ──────────────────────────────────────────────────────────

const trendOption = computed<EChartsOption>(() => {
  const trend = summary.monthlyTrend ?? []
  if (!trend.length) return {}

  const months = trend.map((t) => t.month)
  const counts = trend.map((t) => t.count)
  const amounts = trend.map((t) => t.amount)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter(params: any) {
        const lines = params.map((p: any) => {
          const val =
            p.seriesName === '报销金额'
              ? `¥${formatAmount(p.value)}`
              : `${p.value} 笔`
          return `${p.marker}${p.seriesName}：${val}`
        })
        return `${params[0].axisValue}<br/>${lines.join('<br/>')}`
      },
    },
    legend: {
      data: ['报销笔数', '报销金额'],
      bottom: 0,
    },
    grid: {
      left: 60,
      right: 60,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLabel: { fontSize: 12 },
    },
    yAxis: [
      {
        type: 'value',
        name: '笔数',
        nameTextStyle: { fontSize: 12 },
        axisLabel: {
          fontSize: 12,
          formatter: (v: number) => `${v}`,
        },
      },
      {
        type: 'value',
        name: '金额(元)',
        nameTextStyle: { fontSize: 12 },
        axisLabel: {
          fontSize: 12,
          formatter: (v: number) => {
            if (v >= 10000) return `${(v / 10000).toFixed(1)}万`
            return String(v)
          },
        },
      },
    ],
    series: [
      {
        name: '报销笔数',
        type: 'bar',
        yAxisIndex: 0,
        data: counts,
        itemStyle: { color: '#4f6ef7', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 40,
      },
      {
        name: '报销金额',
        type: 'line',
        yAxisIndex: 1,
        data: amounts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,197,94,0.2)' },
              { offset: 1, color: 'rgba(34,197,94,0.02)' },
            ],
          },
        },
      },
    ],
  }
})

const categoryOption = computed<EChartsOption>(() => {
  if (!categoryData.value.length) return {}

  const pieData = categoryData.value.map((c) => ({
    name: c.categoryName,
    value: c.totalAmount,
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter(params: any) {
        return `${params.name}<br/>¥${formatAmount(params.value)}<br/>占比 ${params.percent}%`
      },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'middle',
      textStyle: { fontSize: 12 },
      formatter: (name: string) => {
        const item = categoryData.value.find((c) => c.categoryName === name)
        return item ? `${name}  ¥${formatAmount(item.totalAmount)}` : name
      },
    },
    series: [
      {
        name: '费用类别',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            formatter: '{b}\n{d}%',
          },
        },
        data: pieData,
      },
    ],
  }
})

// ─── Table columns ────────────────────────────────────────────────────────────

const deptColumns = [
  {
    title: '部门名称',
    dataIndex: 'departmentName',
    key: 'departmentName',
    width: 160,
    ellipsis: true,
  },
  {
    title: '报销笔数',
    dataIndex: 'count',
    key: 'count',
    width: 90,
    align: 'right' as const,
    sorter: (a: DeptItem, b: DeptItem) => a.count - b.count,
  },
  {
    title: '报销总额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: DeptItem, b: DeptItem) => a.totalAmount - b.totalAmount,
  },
  {
    title: '通过金额',
    dataIndex: 'approvedAmount',
    key: 'approvedAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: DeptItem, b: DeptItem) => a.approvedAmount - b.approvedAmount,
  },
  {
    title: '预算使用率',
    dataIndex: 'budgetUsageRate',
    key: 'budgetUsageRate',
    width: 180,
    sorter: (a: DeptItem, b: DeptItem) => (a.budgetUsageRate ?? 0) - (b.budgetUsageRate ?? 0),
  },
  {
    title: '最多类别',
    dataIndex: 'topCategory',
    key: 'topCategory',
    width: 120,
    ellipsis: true,
  },
]

const projectColumns = [
  {
    title: '项目名称',
    dataIndex: 'projectName',
    key: 'projectName',
    width: 180,
    ellipsis: true,
  },
  {
    title: '项目编码',
    dataIndex: 'projectCode',
    key: 'projectCode',
    width: 120,
  },
  {
    title: '总预算',
    dataIndex: 'totalBudget',
    key: 'totalBudget',
    width: 140,
    align: 'right' as const,
    sorter: (a: ProjectItem, b: ProjectItem) => a.totalBudget - b.totalBudget,
  },
  {
    title: '已报销',
    dataIndex: 'usedAmount',
    key: 'usedAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: ProjectItem, b: ProjectItem) => a.usedAmount - b.usedAmount,
  },
  {
    title: '预算使用率',
    dataIndex: 'budgetUsageRate',
    key: 'budgetUsageRate',
    width: 180,
    sorter: (a: ProjectItem, b: ProjectItem) =>
      (a.budgetUsageRate ?? 0) - (b.budgetUsageRate ?? 0),
  },
  {
    title: '报销笔数',
    dataIndex: 'reimbursementCount',
    key: 'reimbursementCount',
    width: 90,
    align: 'right' as const,
    sorter: (a: ProjectItem, b: ProjectItem) =>
      a.reimbursementCount - b.reimbursementCount,
  },
]

const employeeColumns = [
  {
    title: '姓名',
    dataIndex: 'realName',
    key: 'realName',
    width: 100,
  },
  {
    title: '部门',
    dataIndex: 'departmentName',
    key: 'departmentName',
    width: 140,
    ellipsis: true,
  },
  {
    title: '报销笔数',
    dataIndex: 'count',
    key: 'count',
    width: 90,
    align: 'right' as const,
    sorter: (a: EmployeeItem, b: EmployeeItem) => a.count - b.count,
  },
  {
    title: '报销总额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: EmployeeItem, b: EmployeeItem) => a.totalAmount - b.totalAmount,
  },
  {
    title: '通过金额',
    dataIndex: 'approvedAmount',
    key: 'approvedAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: EmployeeItem, b: EmployeeItem) => a.approvedAmount - b.approvedAmount,
  },
  {
    title: '驳回次数',
    dataIndex: 'rejectedCount',
    key: 'rejectedCount',
    width: 90,
    align: 'center' as const,
    sorter: (a: EmployeeItem, b: EmployeeItem) => a.rejectedCount - b.rejectedCount,
  },
  {
    title: '平均金额',
    dataIndex: 'averageAmount',
    key: 'averageAmount',
    width: 140,
    align: 'right' as const,
    sorter: (a: EmployeeItem, b: EmployeeItem) => a.averageAmount - b.averageAmount,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildParams() {
  const [startDate, endDate] = filters.dateRange ?? []
  return {
    companyId: filters.companyId,
    startDate,
    endDate,
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadSummary() {
  summaryLoading.value = true
  try {
    const data = await request.get<SummaryData>('/v1/reports/summary', {
      params: buildParams(),
    })
    summary.totalReimbursements = data.totalReimbursements ?? 0
    summary.totalAmount = data.totalAmount ?? 0
    summary.approvedAmount = data.approvedAmount ?? 0
    summary.averageApprovalDays = data.averageApprovalDays ?? 0
    summary.monthlyTrend = data.monthlyTrend ?? []
  } catch {
    // error already shown by request interceptor
  } finally {
    summaryLoading.value = false
  }
}

async function loadCategoryData() {
  categoryLoading.value = true
  try {
    const data = await request.get<CategoryItem[]>('/v1/reports/by-category', {
      params: buildParams(),
    })
    categoryData.value = data ?? []
  } catch {
    // ignore
  } finally {
    categoryLoading.value = false
  }
}

async function loadDeptData() {
  deptLoading.value = true
  try {
    const data = await request.get<DeptItem[]>('/v1/reports/by-department', {
      params: buildParams(),
    })
    deptData.value = data ?? []
  } catch {
    // ignore
  } finally {
    deptLoading.value = false
  }
}

async function loadProjectData() {
  projectLoading.value = true
  try {
    const data = await request.get<ProjectItem[]>('/v1/reports/by-project', {
      params: buildParams(),
    })
    projectData.value = data ?? []
  } catch {
    // ignore
  } finally {
    projectLoading.value = false
  }
}

async function loadEmployeeData(page = 1) {
  employeeLoading.value = true
  try {
    const [startDate, endDate] = filters.dateRange ?? []
    const data = await request.get<{ list: EmployeeItem[]; total: number }>(
      '/v1/reports/by-employee',
      {
        params: {
          startDate,
          endDate,
          page,
          pageSize: employeePagination.pageSize,
        },
      },
    )
    employeeData.value = data?.list ?? []
    employeePagination.total = data?.total ?? 0
    employeePagination.current = page
  } catch {
    // ignore
  } finally {
    employeeLoading.value = false
  }
}

async function loadAllData() {
  await Promise.all([
    loadSummary(),
    loadCategoryData(),
    loadDeptData(),
    loadProjectData(),
    loadEmployeeData(1),
  ])
}

async function loadCompanies() {
  try {
    const data = await request.get<OrgTreeNode[]>('/v1/organizations/tree')
    companyOptions.value = (data ?? [])
      .filter((node) => node.type === 'company')
      .map((node) => ({
        label: node.name,
        value: node.id,
      }))
  } catch {
    companyOptions.value = []
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function handleFilterChange() {
  // Trigger is query button, but also called on date-picker change for convenience
}

function handleReset() {
  filters.companyId = undefined
  filters.dateRange = [...defaultDateRange]
  loadAllData()
}

function handleEmployeeTableChange(pagination: TablePaginationConfig) {
  loadEmployeeData(pagination.current ?? 1)
  employeePagination.pageSize = pagination.pageSize ?? 20
}

async function handleExport() {
  const [startDate, endDate] = filters.dateRange ?? []
  exporting.value = true
  try {
    const data = await request.post<{ downloadUrl?: string; taskId?: string }>(
      '/v1/reports/export',
      {
        reportType: 'summary',
        format: 'excel',
        filters: {
          companyId: filters.companyId,
          startDate,
          endDate,
        },
      },
    )
    if (data?.downloadUrl) {
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = `报销统计报表_${startDate}_${endDate}.xlsx`
      link.click()
      message.success('导出成功')
    } else {
      message.success('导出任务已提交，请稍后在下载中心查看')
    }
  } catch {
    // ignore
  } finally {
    exporting.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  loadCompanies()
  loadAllData()
})
</script>

<style scoped lang="less">
.report-dashboard {
  padding-bottom: 32px;
}

/* ── Hero Banner ── */
.page-banner {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 75%, #1a2a5e 100%);
  border-radius: var(--r-xl);
  padding: 28px 28px 20px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(26, 26, 46, 0.35);
}

.page-banner__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-banner__left {
  flex: 1;
}

.page-banner__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(79, 110, 247, 0.25);
  border: 1px solid rgba(79, 110, 247, 0.4);
  color: #93b4ff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: var(--r-full);
}

/* Decorative floating circles */
.page-banner__decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 180px;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(79, 110, 247, 0.15);

  &--1 {
    width: 180px;
    height: 180px;
    top: -60px;
    right: -40px;
    background: radial-gradient(circle, rgba(79, 110, 247, 0.06) 0%, transparent 70%);
  }

  &--2 {
    width: 100px;
    height: 100px;
    top: 20px;
    right: 80px;
    border-color: rgba(123, 147, 255, 0.2);
    animation: floatCircle 6s ease-in-out infinite;
  }

  &--3 {
    width: 60px;
    height: 60px;
    top: 60px;
    right: 20px;
    background: rgba(79, 110, 247, 0.08);
    border-color: rgba(79, 110, 247, 0.25);
    animation: floatCircle 4s ease-in-out infinite reverse;
  }
}

@keyframes floatCircle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* ── Banner Filter Row ── */
.banner-filter {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--r-lg);
  padding: 12px 16px;
  backdrop-filter: blur(8px);
}

.banner-filter__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-filter__label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.banner-select,
.banner-picker {
  :deep(.ant-select-selector),
  :deep(.ant-picker) {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: rgba(255, 255, 255, 0.9) !important;
    border-radius: var(--r-md) !important;
  }

  :deep(.ant-select-selection-placeholder),
  :deep(.ant-picker-input > input::placeholder) {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  :deep(.ant-select-selection-item) {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  :deep(.ant-select-arrow),
  :deep(.ant-picker-suffix),
  :deep(.ant-picker-separator),
  :deep(.ant-picker-input > input) {
    color: rgba(255, 255, 255, 0.6) !important;
  }
}

.banner-btn {
  background: var(--primary) !important;
  border-color: var(--primary) !important;
  font-weight: 600;
}

.banner-btn-ghost {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 500;

  &:hover {
    background: rgba(255, 255, 255, 0.14) !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
    color: #fff !important;
  }
}

/* ── Stat Cards ── */
.stat-row {
  margin-bottom: 20px;
}

.stat-card {
  background: var(--bg-container);
  border-radius: var(--r-lg);
  padding: 20px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
  }

  &--blue::before   { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
  &--green::before  { background: linear-gradient(90deg, var(--success), #4ade80); }
  &--orange::before { background: linear-gradient(90deg, var(--warning), #fbbf24); }
  &--purple::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);

    &::before { opacity: 1; }
  }
}

.stat-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}

.stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card__trend {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--r-full);

  &--up {
    color: var(--success);
    background: var(--success-bg);
  }

  &--down {
    color: var(--primary);
    background: var(--primary-bg);
  }
}

.stat-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.stat-currency {
  font-size: 16px;
  font-weight: 600;
  margin-right: 2px;
  opacity: 0.8;
}

.stat-card__unit {
  font-size: 14px;
  font-weight: 500;
  margin-left: 2px;
  opacity: 0.7;
}

.stat-card__footer {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ── Chart Cards ── */
.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  transition: all var(--duration-normal) var(--ease-out) !important;

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg) !important;
  }
}

.chart-card__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.chart-card__title-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.chart-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--r-full);
  font-size: 12px;
  font-weight: 500;

  &--blue   { color: var(--primary); background: var(--primary-bg); border: 1px solid rgba(79,110,247,0.15); }
  &--purple { color: #8b5cf6; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15); }
  &--cyan   { color: #06b6d4; background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.15); }
  &--green  { color: var(--success); background: var(--success-bg); border: 1px solid rgba(34,197,94,0.15); }
  &--orange { color: var(--warning); background: var(--warning-bg); border: 1px solid rgba(245,158,11,0.15); }
}

/* ── Chart Container ── */
.chart-container {
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.echart {
  width: 100%;
  height: 100%;
}

.chart-empty {
  color: var(--text-tertiary);
}

/* ── Section cards ── */
.section-card {
  transition: all var(--duration-normal) var(--ease-out) !important;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md) !important;
  }
}

.table-section {
  margin-bottom: 16px;
}

/* ── Progress cell ── */
.progress-cell {
  min-width: 140px;

  :deep(.ant-progress) {
    margin-bottom: 0;
  }
}

/* ── Amount cells ── */
.amount-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;

  &--approved {
    color: var(--success);
  }
}

.text-muted {
  color: var(--text-quaternary);
}

.text-success {
  color: var(--success);
  font-weight: 500;
}
</style>
