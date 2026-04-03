import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { KvmDetailPage } from '../pages/kvm-detail-page'
import type {
  KVMCurrentMetrics,
  KVMDetail,
  KVMItem,
  NodeMonitoring,
  NodeMetricsPoint,
  VNCBootstrap,
} from '../types/api'

type KvmDetailRouteProps = {
  kvms: KVMItem[]
  loadKvmWorkspaceByIds: (nodeId: number, vmid: number, timeframe?: 'day' | 'week') => Promise<void>
  selectedKvm: KVMItem | null
  detailLoading: boolean
  detailError: string | null
  detail: KVMDetail | null
  metrics: KVMCurrentMetrics | null
  monitoring: NodeMonitoring | null
  timeframe: 'day' | 'week'
  vncBootstrap: VNCBootstrap | null
  actionLoading: string | null
  onBack: () => void
  onRefresh: (timeframe?: 'day' | 'week') => void
  onAction: (action: 'start' | 'shutdown' | 'stop') => void
  formatPercent: (value: number | null) => string
  formatBytes: (value: number | null) => string
  formatSeconds: (value: number | null) => string
  metricSummary: (points: NodeMetricsPoint[], key: keyof Pick<NodeMetricsPoint, 'cpu' | 'mem' | 'disk' | 'netin' | 'netout'>) => string
}

export function KvmDetailRoute(props: KvmDetailRouteProps) {
  const params = useParams()
  const nodeId = Number(params.nodeId)
  const vmid = Number(params.vmid)

  useEffect(() => {
    if (!Number.isFinite(nodeId) || !Number.isFinite(vmid)) return
    void props.loadKvmWorkspaceByIds(nodeId, vmid, props.timeframe)
  }, [nodeId, vmid])

  const fallback = props.kvms.find((item) => item.node_id === nodeId && item.vmid === vmid) ?? props.selectedKvm

  return (
    <KvmDetailPage
      selectedKvm={fallback}
      detailLoading={props.detailLoading}
      detailError={props.detailError}
      detail={props.detail}
      metrics={props.metrics}
      monitoringPoints={props.monitoring?.points ?? []}
      timeframe={props.timeframe}
      vncBootstrap={props.vncBootstrap}
      actionLoading={props.actionLoading}
      formatPercent={props.formatPercent}
      formatBytes={props.formatBytes}
      formatSeconds={props.formatSeconds}
      metricSummary={props.metricSummary}
      onBack={props.onBack}
      onRefresh={props.onRefresh}
      onAction={props.onAction}
    />
  )
}
