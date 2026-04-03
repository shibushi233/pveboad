import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { useAdminState } from './use-admin-state'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('useAdminState', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
  })

  it('loads inventory and syncs permission form', async () => {
    const { result } = renderHook(() => useAdminState())
    const setPageMessage = vi.fn()

    mockedApiFetch.mockResolvedValueOnce({
      node_id: 7,
      node_name: 'node-a',
      kvms: [{ vmid: 101, name: 'vm-101', status: 'running', cpu: 0.5, maxmem: 1024, maxdisk: 2048 }],
    })

    await act(async () => {
      await result.current.handleLoadNodeInventory(7, setPageMessage)
    })

    expect(mockedApiFetch).toHaveBeenCalledWith('/admin/nodes/7/inventory')
    expect(result.current.selectedNodeInventory?.node_id).toBe(7)
    expect(result.current.permissionForm.pve_node_id).toBe('7')
    expect(result.current.permissionForm.vmid).toBe('')
    expect(setPageMessage).toHaveBeenCalledWith('已加载节点 node-a 的 KVM 列表')
  })

  it('posts numeric permission payload and clears vmid on success', async () => {
    const { result } = renderHook(() => useAdminState())
    const setSubmitting = vi.fn()
    const setPageMessage = vi.fn()

    await act(async () => {
      result.current.setPermissionForm({ user_id: '3', pve_node_id: '7', vmid: '101' })
    })

    mockedApiFetch
      .mockResolvedValueOnce({ id: 1, user_id: 3, pve_node_id: 7, vmid: 101, vm_type: 'qemu' })
      .mockResolvedValueOnce([
        { id: 9, username: 'user-a', role: 'user', is_active: true, must_change_password: false },
      ])
      .mockResolvedValueOnce([
        { id: 7, name: 'node-a', api_base_url: 'https://pve.example:8006', selected_version: '8.2.2', detected_version: '8.2.2', last_validated_at: null, is_active: true },
      ])
      .mockResolvedValueOnce([
        { id: 1, user_id: 3, pve_node_id: 7, vmid: 101, vm_type: 'qemu' },
      ])

    await act(async () => {
      await result.current.handleAssignPermission({ preventDefault() {} } as React.FormEvent, setSubmitting, setPageMessage)
    })

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, '/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({ user_id: 3, pve_node_id: 7, vmid: 101, vm_type: 'qemu' }),
    })
    expect(result.current.permissionForm.vmid).toBe('')
    expect(setPageMessage).toHaveBeenCalledWith('用户 KVM 权限分配成功')
    expect(setSubmitting).toHaveBeenCalledWith(true)
    expect(setSubmitting).toHaveBeenLastCalledWith(false)
  })
})
