import { FormEvent } from 'react'

import { AdminConsole } from '../features/admin/admin-console'
import type {
  AdminUserItem,
  NodeInventoryResponse,
  NodeItem,
  NodeValidationResult,
  PermissionItem,
} from '../types/api'

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

type AdminPageProps = {
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

export function AdminPage(props: AdminPageProps) {
  return <AdminConsole {...props} />
}
