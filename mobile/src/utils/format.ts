export function formatMoney(value?: number | null) {
  return Number(value ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, '0')
  const dd = `${date.getDate()}`.padStart(2, '0')
  if (!withTime) {
    return `${yyyy}-${mm}-${dd}`
  }
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mi = `${date.getMinutes()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function statusLabel(status?: number, fallback?: string) {
  if (fallback) {
    return fallback
  }
  const labels: Record<number, string> = {
    0: '草稿',
    1: '待审批',
    2: '审批中',
    3: '已通过',
    4: '已驳回',
    5: '已撤回',
    6: '已付款',
    7: '已关闭',
  }
  return labels[status ?? -1] || '处理中'
}

export function statusTone(status?: number) {
  switch (status) {
    case 0:
      return 'slate'
    case 1:
    case 2:
      return 'blue'
    case 3:
      return 'green'
    case 4:
      return 'red'
    case 5:
      return 'orange'
    case 6:
      return 'emerald'
    case 7:
      return 'gray'
    default:
      return 'slate'
  }
}
