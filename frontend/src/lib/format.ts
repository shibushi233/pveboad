import type { NodeMetricsPoint } from '../types/api'

export function formatBytes(value: number | null) {
  if (value == null) return '—'
  const gib = value / 1024 / 1024 / 1024
  if (gib >= 1) return `${gib.toFixed(1)} GiB`
  const mib = value / 1024 / 1024
  return `${mib.toFixed(0)} MiB`
}

export function formatPercent(value: number | null) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatSeconds(value: number | null) {
  if (value == null) return '—'
  const days = Math.floor(value / 86400)
  const hours = Math.floor((value % 86400) / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  if (days > 0) return `${days}天 ${hours}小时`
  if (hours > 0) return `${hours}小时 ${minutes}分钟`
  return `${minutes}分钟`
}

export function metricSummary(points: NodeMetricsPoint[], key: keyof Pick<NodeMetricsPoint, 'cpu' | 'mem' | 'disk' | 'netin' | 'netout'>) {
  const values = points.map((point) => point[key]).filter((value): value is number => value != null)
  if (values.length === 0) return '—'
  const latest = values[values.length - 1]
  if (key === 'netin' || key === 'netout') return `${latest.toFixed(0)}`
  return `${(latest * 100).toFixed(1)}%`
}
