export type UserSummary = {
  id: number
  username: string
  role: string
  must_change_password: boolean
  is_active: boolean
}

export type LoginResponse = {
  message: string
  user: UserSummary
}

export type KVMItem = {
  node_id: number
  node_name: string
  vmid: number
  vm_type: string
  name: string | null
  status: string | null
  cpu: number | null
  maxmem: number | null
  maxdisk: number | null
}

export type KVMNetworkItem = {
  key: string
  model: string | null
  bridge: string | null
  macaddr: string | null
  tag: number | null
  rate: number | null
  raw: string
}

export type KVMDetail = KVMItem & {
  config: Record<string, string | number | boolean | null>
  networks: KVMNetworkItem[]
}

export type KVMCurrentMetrics = {
  node_id: number
  node_name: string
  vmid: number
  status: string | null
  cpu: number | null
  mem: number | null
  maxmem: number | null
  disk: number | null
  maxdisk: number | null
  uptime: number | null
}

export type NodeMetricsPoint = {
  time: number | null
  cpu: number | null
  mem: number | null
  disk: number | null
  netin: number | null
  netout: number | null
}

export type NodeMonitoring = {
  node_id: number
  node_name: string
  timeframe: string
  points: NodeMetricsPoint[]
}

export type VNCBootstrap = {
  node_id: number
  node_name: string
  vmid: number
  websocket_url: string | null
  password: string | null
  message: string
}

export type AdminUserItem = {
  id: number
  username: string
  role: string
  is_active: boolean
  must_change_password: boolean
}

export type PermissionItem = {
  id: number
  user_id: number
  pve_node_id: number
  vmid: number
  vm_type: string
}

export type NodeKVMInventoryItem = {
  vmid: number
  name: string | null
  status: string | null
  cpu: number | null
  maxmem: number | null
  maxdisk: number | null
}

export type NodeValidationResult = {
  reachable: boolean
  selected_version: string
  detected_version: string | null
  save_allowed: boolean
  message: string
  discovered_kvms: NodeKVMInventoryItem[]
}

export type NodeItem = {
  id: number
  name: string
  api_base_url: string
  selected_version: string
  detected_version: string | null
  last_validated_at: string | null
  is_active: boolean
}

export type NodeCreateResponse = NodeItem & {
  message: string
  discovered_kvms: NodeKVMInventoryItem[]
}

export type NodeInventoryResponse = {
  node_id: number
  node_name: string
  kvms: NodeKVMInventoryItem[]
}

export type AdminUserCreateRequest = {
  username: string
  password: string
  role: 'admin' | 'user'
}

export type AdminUserStatusRequest = {
  is_active: boolean
}

export type AppView = 'list' | 'detail' | 'password' | 'admin' | 'admin-users'
