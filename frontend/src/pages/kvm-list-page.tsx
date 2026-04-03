import { Monitor, Power } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import type { KVMItem } from '../types/api'

type KvmListPageProps = {
  kvms: KVMItem[]
  error: string | null
  formatBytes: (value: number | null) => string
  formatPercent: (value: number | null) => string
  onOpenDetail: (kvm: KVMItem) => void
}

export function KvmListPage({ kvms, error, formatBytes, formatPercent, onOpenDetail }: KvmListPageProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-slate-900">
          <Monitor className="h-5 w-5" />
          <CardTitle>我的 KVM</CardTitle>
        </div>
        <CardDescription>列表数据来自后端授权过滤后的 `/api/user/kvms`。</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">节点</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">VMID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">名称</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">CPU</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">内存</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">磁盘</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {kvms.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>当前没有已授权的 KVM。</td>
                </tr>
              ) : (
                kvms.map((kvm) => (
                  <tr key={`${kvm.node_id}-${kvm.vmid}`}>
                    <td className="px-4 py-3">{kvm.node_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{kvm.vmid}</td>
                    <td className="px-4 py-3">{kvm.name ?? '未命名'}</td>
                    <td className="px-4 py-3">{kvm.status ?? '未知'}</td>
                    <td className="px-4 py-3">{formatPercent(kvm.cpu)}</td>
                    <td className="px-4 py-3">{formatBytes(kvm.maxmem)}</td>
                    <td className="px-4 py-3">{formatBytes(kvm.maxdisk)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => onOpenDetail(kvm)}>
                        <Power className="h-4 w-4" />
                        查看 / 操作
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
