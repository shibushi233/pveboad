import { FormEvent, useState } from 'react'

import { apiFetch } from '../lib/api'
import type {
  AdminUserCreateRequest,
  AdminUserItem,
  AdminUserStatusRequest,
  NodeCreateResponse,
  NodeInventoryResponse,
  NodeItem,
  NodeValidationResult,
  PermissionItem,
  UserSummary,
} from '../types/api'

export function useAdminState() {
  const [nodeForm, setNodeForm] = useState({ name: '', api_base_url: '', token_id: '', token_secret: '', selected_version: '8.2.2' })
  const [permissionForm, setPermissionForm] = useState({ user_id: '', pve_node_id: '', vmid: '' })
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([])
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<number | null>(null)
  const [validationResult, setValidationResult] = useState<NodeValidationResult | null>(null)
  const [selectedNodeInventory, setSelectedNodeInventory] = useState<NodeInventoryResponse | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  async function loadAdminData(targetUserId?: number) {
    try {
      const [usersResult, nodesResult] = await Promise.all([
        apiFetch<AdminUserItem[]>('/admin/users'),
        apiFetch<NodeItem[]>('/admin/nodes'),
      ])
      setAdminUsers(usersResult)
      setNodes(nodesResult)
      const nextUserId = targetUserId ?? selectedAdminUserId ?? usersResult.find((item) => item.role === 'user')?.id ?? usersResult[0]?.id ?? null
      setSelectedAdminUserId(nextUserId)
      if (nextUserId) {
        const userPermissions = await apiFetch<PermissionItem[]>(`/admin/users/${nextUserId}/permissions`)
        setPermissions(userPermissions)
      } else {
        setPermissions([])
      }
      setAdminError(null)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '加载管理员数据失败')
    }
  }

  async function loadForUser(user: UserSummary) {
    if (user.role === 'admin') {
      await loadAdminData()
    }
  }

  function resetAdminState() {
    setAdminUsers([])
    setNodes([])
    setPermissions([])
    setSelectedNodeInventory(null)
    setValidationResult(null)
    setAdminError(null)
  }

  async function handleValidateNode(event: FormEvent, setSubmitting: (value: boolean) => void, setPageMessage: (message: string) => void) {
    event.preventDefault()
    setSubmitting(true)
    setAdminError(null)
    try {
      const result = await apiFetch<NodeValidationResult>('/admin/nodes/validate', { method: 'POST', body: JSON.stringify(nodeForm) })
      setValidationResult(result)
      setPageMessage(result.message)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '节点校验失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateNode(setSubmitting: (value: boolean) => void, setPageMessage: (message: string) => void) {
    setSubmitting(true)
    setAdminError(null)
    try {
      const result = await apiFetch<NodeCreateResponse>('/admin/nodes', { method: 'POST', body: JSON.stringify(nodeForm) })
      setValidationResult({ reachable: true, selected_version: result.selected_version, detected_version: result.detected_version, save_allowed: true, message: result.message, discovered_kvms: result.discovered_kvms })
      setNodeForm({ name: '', api_base_url: '', token_id: '', token_secret: '', selected_version: result.selected_version })
      setPageMessage(result.message)
      await loadAdminData()
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '节点创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLoadNodeInventory(nodeId: number, setPageMessage: (message: string) => void) {
    setAdminError(null)
    try {
      const result = await apiFetch<NodeInventoryResponse>(`/admin/nodes/${nodeId}/inventory`)
      setSelectedNodeInventory(result)
      setPermissionForm((prev) => ({ ...prev, pve_node_id: String(nodeId), vmid: '' }))
      setPageMessage(`已加载节点 ${result.node_name} 的 KVM 列表`)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '加载节点 KVM 列表失败')
    }
  }

  async function handleSelectAdminUser(userId: number) {
    setSelectedAdminUserId(userId)
    setPermissionForm((prev) => ({ ...prev, user_id: String(userId) }))
    await loadAdminData(userId)
  }

  async function handleAssignPermission(event: FormEvent, setSubmitting: (value: boolean) => void, setPageMessage: (message: string) => void) {
    event.preventDefault()
    setSubmitting(true)
    setAdminError(null)
    try {
      const payload = { user_id: Number(permissionForm.user_id), pve_node_id: Number(permissionForm.pve_node_id), vmid: Number(permissionForm.vmid), vm_type: 'qemu' }
      await apiFetch<PermissionItem>('/admin/permissions', { method: 'POST', body: JSON.stringify(payload) })
      setPageMessage('用户 KVM 权限分配成功')
      setPermissionForm((prev) => ({ ...prev, vmid: '' }))
      await loadAdminData(payload.user_id)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '权限分配失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateAdminUser(payload: AdminUserCreateRequest, setSubmitting: (value: boolean) => void, setPageMessage: (message: string) => void) {
    setSubmitting(true)
    setAdminError(null)
    try {
      await apiFetch<AdminUserItem>('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
      setPageMessage('用户创建成功')
      await loadAdminData()
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '创建用户失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleAdminUserStatus(userId: number, isActive: boolean, setSubmitting: (value: boolean) => void, setPageMessage: (message: string) => void) {
    setSubmitting(true)
    setAdminError(null)
    try {
      const payload: AdminUserStatusRequest = { is_active: isActive }
      await apiFetch<AdminUserItem>(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify(payload) })
      setPageMessage(isActive ? '用户已启用' : '用户已禁用')
      await loadAdminData(selectedAdminUserId ?? undefined)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '更新用户状态失败')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    nodeForm,
    permissionForm,
    adminUsers,
    nodes,
    permissions,
    selectedAdminUserId,
    validationResult,
    selectedNodeInventory,
    adminError,
    setNodeForm,
    setPermissionForm,
    loadForUser,
    resetAdminState,
    handleValidateNode,
    handleCreateNode,
    handleLoadNodeInventory,
    handleSelectAdminUser,
    handleAssignPermission,
    handleCreateAdminUser,
    handleToggleAdminUserStatus,
  }
}
