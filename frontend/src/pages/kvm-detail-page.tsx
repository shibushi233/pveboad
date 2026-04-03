import { Loader2, RefreshCw } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { VNCConsole } from '../features/vnc/vnc-console'
import type { KVMCurrentMetrics, KVMDetail, KVMItem, NodeMetricsPoint, VNCBootstrap } from '../types/api'

type KvmDetailPageProps = {
  selectedKvm: KVMItem | null
  detailLoading: boolean
  detailError: string | null
  detail: KVMDetail | null
  metrics: KVMCurrentMetrics | null
  monitoringPoints: NodeMetricsPoint[]
  timeframe: 'day' | 'week'
  vncBootstrap: VNCBootstrap | null
  actionLoading: string | null
  formatPercent: (value: number | null) => string
  formatBytes: (value: number | null) => string
  formatSeconds: (value: number | null) => string
  metricSummary: (points: NodeMetricsPoint[], key: keyof Pick<NodeMetricsPoint, 'cpu' | 'mem' | 'disk' | 'netin' | 'netout'>) => string
  onBack: () => void
  onRefresh: (timeframe?: 'day' | 'week') => void
  onAction: (action: 'start' | 'shutdown' | 'stop') => void
}

export function KvmDetailPage({
  selectedKvm,
  detailLoading,
  detailError,
  detail,
  metrics,
  monitoringPoints,
  timeframe,
  vncBootstrap,
  actionLoading,
  formatPercent,
  formatBytes,
  formatSeconds,
  metricSummary,
  onBack,
  onRefresh,
  onAction,
}: KvmDetailPageProps) {
  const selectedConfigEntries = detail ? Object.entries(detail.config).slice(0, 8) : []

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{selectedKvm?.name ?? `KVM ${selectedKvm?.vmid ?? ''}`}</CardTitle>
                <CardDescription>节点 {selectedKvm?.node_name} / VMID {selectedKvm?.vmid}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>返回列表</Button>
                <Button variant="outline" className="gap-2" onClick={() => onRefresh()}>
                  <RefreshCw className="h-4 w-4" />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载 KVM 详情...
              </div>
            ) : detailError ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{detailError}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">运行状态</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{metrics?.status ?? detail?.status ?? '未知'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">当前 CPU</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{formatPercent(metrics?.cpu ?? detail?.cpu ?? null)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">运行时长</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{formatSeconds(metrics?.uptime ?? null)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作菜单</CardTitle>
            <CardDescription>第一期支持开机、关机、停止，以及 VNC 引导信息展示。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button disabled={actionLoading !== null} onClick={() => onAction('start')}>开机</Button>
              <Button disabled={actionLoading !== null} variant="outline" onClick={() => onAction('shutdown')}>关机</Button>
              <Button disabled={actionLoading !== null} variant="outline" onClick={() => onAction('stop')}>停止</Button>
            </div>
            {actionLoading ? <div className="text-sm text-slate-500">正在提交 {actionLoading} 操作...</div> : null}
          </CardContent>
        </Card>

        <VNCConsole bootstrap={vncBootstrap} title={selectedKvm ? `${selectedKvm.node_name} / VMID ${selectedKvm.vmid}` : '当前未选择 KVM'} />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>监控标签菜单</CardTitle>
                <CardDescription>节点 day/week 基础监控已接入。</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={timeframe === 'day' ? 'default' : 'outline'} onClick={() => onRefresh('day')}>日视图</Button>
                <Button size="sm" variant={timeframe === 'week' ? 'default' : 'outline'} onClick={() => onRefresh('week')}>周视图</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">节点 CPU</div><div className="mt-2 text-lg font-semibold text-slate-900">{metricSummary(monitoringPoints, 'cpu')}</div></div>
              <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">节点内存</div><div className="mt-2 text-lg font-semibold text-slate-900">{metricSummary(monitoringPoints, 'mem')}</div></div>
              <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">节点磁盘</div><div className="mt-2 text-lg font-semibold text-slate-900">{metricSummary(monitoringPoints, 'disk')}</div></div>
              <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">流入</div><div className="mt-2 text-lg font-semibold text-slate-900">{metricSummary(monitoringPoints, 'netin')}</div></div>
              <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">流出</div><div className="mt-2 text-lg font-semibold text-slate-900">{metricSummary(monitoringPoints, 'netout')}</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>系统配置</CardTitle><CardDescription>第一期按只读展示。</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {selectedConfigEntries.length === 0 ? <div className="text-slate-500">暂无配置数据。</div> : selectedConfigEntries.map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-md border border-slate-200 px-3 py-2">
                  <span className="text-slate-500">{key}</span>
                  <span className="break-all text-right text-slate-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>网卡信息</CardTitle><CardDescription>第一期按只读展示。</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {detail?.networks?.length ? detail.networks.map((network) => (
                <div key={network.key} className="rounded-lg border border-slate-200 p-4">
                  <div className="font-medium text-slate-900">{network.key}</div>
                  <div className="mt-2 space-y-1 text-slate-600">
                    <div>型号：{network.model ?? '—'}</div>
                    <div>桥接：{network.bridge ?? '—'}</div>
                    <div>MAC：{network.macaddr ?? '—'}</div>
                    <div>VLAN：{network.tag ?? '—'}</div>
                  </div>
                </div>
              )) : <div className="text-slate-500">暂无网卡信息。</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>当前资源</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"><span>内存使用</span><span className="text-slate-900">{formatBytes(metrics?.mem ?? null)} / {formatBytes(metrics?.maxmem ?? detail?.maxmem ?? null)}</span></div>
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"><span>磁盘使用</span><span className="text-slate-900">{formatBytes(metrics?.disk ?? null)} / {formatBytes(metrics?.maxdisk ?? detail?.maxdisk ?? null)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
