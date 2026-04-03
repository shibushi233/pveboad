import { useState } from 'react'

import { apiFetch } from '../lib/api'
import type {
  KVMCurrentMetrics,
  KVMDetail,
  KVMItem,
  NodeMonitoring,
  UserSummary,
  VNCBootstrap,
} from '../types/api'

export function useKvmState() {
  const [kvms, setKvms] = useState<KVMItem[]>([])
  const [selectedKvm, setSelectedKvm] = useState<KVMItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<KVMDetail | null>(null)
  const [metrics, setMetrics] = useState<KVMCurrentMetrics | null>(null)
  const [monitoring, setMonitoring] = useState<NodeMonitoring | null>(null)
  const [timeframe, setTimeframe] = useState<'day' | 'week'>('day')
  const [vncBootstrap, setVncBootstrap] = useState<VNCBootstrap | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function refreshKvms() {
    const vmList = await apiFetch<KVMItem[]>('/user/kvms')
    setKvms(vmList)
    return vmList
  }

  async function loadForUser(_user: UserSummary) {
    await refreshKvms()
  }

  function resetKvmState() {
    setKvms([])
    setSelectedKvm(null)
    setDetail(null)
    setMetrics(null)
    setMonitoring(null)
    setVncBootstrap(null)
    setDetailError(null)
    setActionLoading(null)
  }

  async function loadKvmWorkspaceByIds(nodeId: number, vmid: number, nextTimeframe: 'day' | 'week' = timeframe, clearPageMessage?: () => void) {
    const fallback = kvms.find((item) => item.node_id === nodeId && item.vmid === vmid) ?? null
    setDetailLoading(true)
    setDetailError(null)
    setSelectedKvm(fallback)
    setDetail(null)
    setMetrics(null)
    setMonitoring(null)
    setVncBootstrap(null)
    clearPageMessage?.()
    try {
      const [detailResult, metricsResult, monitoringResult, vncResult] = await Promise.all([
        apiFetch<KVMDetail>(`/user/kvms/${nodeId}/${vmid}`),
        apiFetch<KVMCurrentMetrics>(`/user/kvms/${nodeId}/${vmid}/metrics/current`),
        apiFetch<NodeMonitoring>(`/user/nodes/${nodeId}/metrics/${nextTimeframe}`),
        apiFetch<VNCBootstrap>(`/user/kvms/${nodeId}/${vmid}/vnc`),
      ])
      const found = kvms.find((item) => item.node_id === nodeId && item.vmid === vmid)
      setSelectedKvm(found ?? detailResult)
      setDetail(detailResult)
      setMetrics(metricsResult)
      setMonitoring(monitoringResult)
      setVncBootstrap(vncResult)
      setTimeframe(nextTimeframe)
    } catch (err) {
      setDetail(null)
      setMetrics(null)
      setMonitoring(null)
      setVncBootstrap(null)
      setDetailError(err instanceof Error ? err.message : '加载 KVM 详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleKvmAction(action: 'start' | 'shutdown' | 'stop', setPageMessage: (message: string) => void) {
    if (!selectedKvm) return
    setActionLoading(action)
    setDetailError(null)
    try {
      const result = await apiFetch<{ message: string }>(`/user/kvms/${selectedKvm.node_id}/${selectedKvm.vmid}/${action}`, { method: 'POST' })
      setPageMessage(result.message)
      await loadKvmWorkspaceByIds(selectedKvm.node_id, selectedKvm.vmid, timeframe)
      await refreshKvms()
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '提交操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  return {
    kvms,
    selectedKvm,
    detailLoading,
    detail,
    metrics,
    monitoring,
    timeframe,
    vncBootstrap,
    detailError,
    actionLoading,
    refreshKvms,
    loadForUser,
    resetKvmState,
    loadKvmWorkspaceByIds,
    handleKvmAction,
  }
}
