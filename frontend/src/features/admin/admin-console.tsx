import { FormEvent, useMemo } from 'react'
import { CheckCircle2, Cpu, HardDrive, HelpCircle, Server, Users } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import type {
  AdminUserItem,
  NodeCreateResponse,
  NodeInventoryResponse,
  NodeItem,
  NodeValidationResult,
  PermissionItem,
} from '../../types/api'

function formatBytes(value: number | null) {
  if (value == null) return '—'
  const gib = value / 1024 / 1024 / 1024
  if (gib >= 1) return `${gib.toFixed(1)} GiB`
  const mib = value / 1024 / 1024
  return `${mib.toFixed(0)} MiB`
}

type NodeFormState = {
  name: string
  api_base_url: string
  token_id: string
  token_secret: string
  selected_version: string
}

type PermissionFormState = {
  user_id: string
  pve_node_id: string
  vmid: string
}

type AdminConsoleProps = {
  submitting: boolean
  adminUsers: AdminUserItem[]
  nodes: NodeItem[]
  permissions: PermissionItem[]
  selectedAdminUserId: number | null
  validationResult: NodeValidationResult | null
  selectedNodeInventory: NodeInventoryResponse | null
  nodeForm: NodeFormState
  permissionForm: PermissionFormState
  onNodeFormChange: (value: NodeFormState | ((prev: NodeFormState) => NodeFormState)) => void
  onPermissionFormChange: (value: PermissionFormState | ((prev: PermissionFormState) => PermissionFormState)) => void
  onValidateNode: (event: FormEvent) => Promise<void>
  onCreateNode: () => Promise<void>
  onLoadNodeInventory: (nodeId: number) => Promise<void>
  onSelectAdminUser: (userId: number) => Promise<void>
  onAssignPermission: (event: FormEvent) => Promise<void>
}

export function AdminConsole({
  submitting,
  adminUsers,
  nodes,
  permissions,
  selectedAdminUserId,
  validationResult,
  selectedNodeInventory,
  nodeForm,
  permissionForm,
  onNodeFormChange,
  onPermissionFormChange,
  onValidateNode,
  onCreateNode,
  onLoadNodeInventory,
  onSelectAdminUser,
  onAssignPermission,
}: AdminConsoleProps) {
  const managedUsers = useMemo(() => adminUsers.filter((item) => item.role === 'user'), [adminUsers])
  const selectedNodeId = Number(permissionForm.pve_node_id) || null
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedVmId = Number(permissionForm.vmid) || null
  const selectedInventoryVm = selectedNodeInventory?.kvms.find((item) => item.vmid === selectedVmId) ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>初始化节点</CardTitle>
            <CardDescription>校验 PVE 版本并在初始化阶段直接读取节点内 KVM 列表。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={(event) => void onValidateNode(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="node_name">节点名称</Label>
                  <Input id="node_name" value={nodeForm.name} onChange={(event) => onNodeFormChange((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selected_version">PVE 版本</Label>
                  <select
                    id="selected_version"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={nodeForm.selected_version}
                    onChange={(event) => onNodeFormChange((prev) => ({ ...prev, selected_version: event.target.value }))}
                  >
                    <option value="8.2.2">8.2.2</option>
                    <option value="9.1.1">9.1.1</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_base_url">API Base URL</Label>
                <Input id="api_base_url" value={nodeForm.api_base_url} onChange={(event) => onNodeFormChange((prev) => ({ ...prev, api_base_url: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="token_id">Token ID</Label>
                  <Input id="token_id" value={nodeForm.token_id} onChange={(event) => onNodeFormChange((prev) => ({ ...prev, token_id: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token_secret">Token Secret</Label>
                  <Input id="token_secret" type="password" value={nodeForm.token_secret} onChange={(event) => onNodeFormChange((prev) => ({ ...prev, token_secret: event.target.value }))} />
                </div>
              </div>
              <details className="group rounded-lg border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  如何获取 PVE API Token？
                </summary>
                <div className="space-y-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <p>在 PVE Web 管理界面中：</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>进入 <strong>Datacenter → Permissions → API Tokens</strong></li>
                    <li>点击 <strong>Add</strong>，选择用户（如 <code className="rounded bg-slate-200 px-1">root@pam</code>）</li>
                    <li>输入 Token ID（如 <code className="rounded bg-slate-200 px-1">panel</code>），取消勾选 Privilege Separation</li>
                    <li>点击 <strong>Add</strong> 后，<strong>立即复制显示的 Secret</strong>（仅显示一次）</li>
                    <li>将 Token ID（格式：<code className="rounded bg-slate-200 px-1">用户@realm!tokenid</code>）和 Secret 填入上方表单</li>
                  </ol>
                </div>
              </details>
              <div className="flex flex-wrap gap-3">
                <Button disabled={submitting} type="submit">{submitting ? '校验中...' : '校验节点'}</Button>
                <Button disabled={submitting || !validationResult?.save_allowed} type="button" variant="outline" onClick={() => void onCreateNode()}>
                  保存节点
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>节点校验结果</CardTitle>
            <CardDescription>只有版本校验通过且所选版本与探测版本一致时才允许保存。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>状态：{validationResult ? (validationResult.save_allowed ? '允许保存' : '禁止保存') : '未校验'}</div>
            <div>探测版本：{validationResult?.detected_version ?? '—'}</div>
            <div>提示：{validationResult?.message ?? '—'}</div>
            <div className="space-y-2">
              <div className="font-medium text-slate-900">校验时发现的 KVM</div>
              {validationResult?.discovered_kvms?.length ? (
                validationResult.discovered_kvms.map((item) => (
                  <div key={item.vmid} className="rounded-md border border-slate-200 px-3 py-2">
                    VMID {item.vmid} · {item.name ?? '未命名'} · {item.status ?? '未知'}
                  </div>
                ))
              ) : (
                <div className="text-slate-500">暂无发现的 KVM。</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>节点列表</CardTitle>
            <CardDescription>先加载节点清单，再从右侧直接挑选 KVM 授权。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nodes.length === 0 ? (
              <div className="text-sm text-slate-500">当前还没有节点。</div>
            ) : (
              nodes.map((node) => {
                const isSelected = selectedNodeInventory?.node_id === node.id
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-left ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    onClick={() => {
                      void onLoadNodeInventory(node.id)
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <Server className="h-4 w-4" />
                        {node.name}
                      </div>
                      <div className="text-sm text-slate-500">版本：{node.detected_version ?? node.selected_version}</div>
                    </div>
                    <div className="text-sm text-slate-600">节点 ID: {node.id}</div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>用户 KVM 权限管理</CardTitle>
            </div>
            <CardDescription>先选用户，再选节点和节点内的 VMID 进行授权。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>选择用户</Label>
              <div className="grid gap-2">
                {managedUsers.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">当前没有可授权的普通用户。</div>
                ) : (
                  managedUsers.map((item) => (
                    <button
                      key={item.id}
                      className={`rounded-md border px-3 py-2 text-left text-sm ${selectedAdminUserId === item.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}
                      onClick={() => {
                        void onSelectAdminUser(item.id)
                      }}
                      type="button"
                    >
                      <div className="font-medium">{item.username}</div>
                      <div className="mt-1 text-xs opacity-80">用户 ID: {item.id}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <form className="space-y-4" onSubmit={(event) => void onAssignPermission(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="permission_user_id">用户</Label>
                  <select
                    id="permission_user_id"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={permissionForm.user_id}
                    onChange={(event) => onPermissionFormChange((prev) => ({ ...prev, user_id: event.target.value }))}
                  >
                    <option value="">请选择用户</option>
                    {managedUsers.map((item) => (
                      <option key={item.id} value={item.id}>{item.username} (#{item.id})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permission_node_id">节点</Label>
                  <select
                    id="permission_node_id"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={permissionForm.pve_node_id}
                    onChange={(event) => onPermissionFormChange((prev) => ({ ...prev, pve_node_id: event.target.value, vmid: '' }))}
                  >
                    <option value="">请选择节点</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.name} (#{node.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">当前授权目标</div>
                    <div className="mt-1">
                      用户 #{permissionForm.user_id || '—'} / 节点 {selectedNode?.name ?? '—'} / VMID {permissionForm.vmid || '—'}
                    </div>
                  </div>
                  {selectedNodeId ? (
                    <Button size="sm" type="button" variant="outline" onClick={() => void onLoadNodeInventory(selectedNodeId)}>
                      刷新节点 KVM
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permission_vmid">VMID</Label>
                <Input
                  id="permission_vmid"
                  value={permissionForm.vmid}
                  onChange={(event) => onPermissionFormChange((prev) => ({ ...prev, vmid: event.target.value }))}
                  placeholder="可手动输入，或在下方点击 KVM 自动填入"
                />
              </div>

              <Button disabled={submitting || !permissionForm.user_id || !permissionForm.pve_node_id || !permissionForm.vmid} type="submit">
                {submitting ? '分配中...' : '分配 KVM 权限'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前节点内 KVM</CardTitle>
            <CardDescription>点击条目即可把 VMID 填入授权表单。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedNodeInventory?.kvms?.length ? (
              selectedNodeInventory.kvms.map((item) => {
                const isSelected = item.vmid === selectedVmId
                return (
                  <button
                    key={item.vmid}
                    type="button"
                    className={`w-full rounded-lg border p-4 text-left ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => onPermissionFormChange((prev) => ({ ...prev, vmid: String(item.vmid) }))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">VMID {item.vmid} · {item.name ?? '未命名'}</div>
                        <div className="mt-1 text-slate-500">状态：{item.status ?? '未知'}</div>
                      </div>
                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : null}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3 text-slate-600">
                      <div className="flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU: {item.cpu == null ? '—' : `${(item.cpu * 100).toFixed(1)}%`}</div>
                      <div className="flex items-center gap-2"><Server className="h-4 w-4" /> 内存: {formatBytes(item.maxmem)}</div>
                      <div className="flex items-center gap-2"><HardDrive className="h-4 w-4" /> 磁盘: {formatBytes(item.maxdisk)}</div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="text-slate-500">请先在左侧选择节点并加载 KVM 列表。</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户已有权限</CardTitle>
            <CardDescription>展示当前选中用户的 KVM 授权记录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {permissions.length ? (
              permissions.map((permission) => (
                <div key={permission.id} className="rounded-md border border-slate-200 px-3 py-2">
                  节点 {permission.pve_node_id} / VMID {permission.vmid} / 类型 {permission.vm_type}
                </div>
              ))
            ) : (
              <div className="text-slate-500">当前用户还没有授权记录。</div>
            )}
            {selectedInventoryVm ? (
              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                已选 KVM：VMID {selectedInventoryVm.vmid} · {selectedInventoryVm.name ?? '未命名'}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
