import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { AdminConsole } from './admin-console'

function renderAdminConsole() {
  const onNodeFormChange = vi.fn()
  const onPermissionFormChange = vi.fn()
  const onValidateNode = vi.fn(async () => {})
  const onCreateNode = vi.fn(async () => {})
  const onLoadNodeInventory = vi.fn(async () => {})
  const onSelectAdminUser = vi.fn(async () => {})
  const onAssignPermission = vi.fn(async () => {})

  render(
    <AdminConsole
      submitting={false}
      adminUsers={[{ id: 3, username: 'user-a', role: 'user', is_active: true, must_change_password: false }]}
      nodes={[{ id: 7, name: 'node-a', api_base_url: 'https://pve.example:8006', selected_version: '8.2.2', detected_version: '8.2.2', last_validated_at: null, is_active: true }]}
      permissions={[]}
      selectedAdminUserId={3}
      validationResult={null}
      selectedNodeInventory={{ node_id: 7, node_name: 'node-a', kvms: [{ vmid: 101, name: 'vm-101', status: 'running', cpu: 0.5, maxmem: 1024, maxdisk: 2048 }] }}
      nodeForm={{ api_base_url: '', token_id: '', token_secret: '', selected_version: '8.2.2' }}
      permissionForm={{ user_id: '3', pve_node_id: '7', vmid: '' }}
      onNodeFormChange={onNodeFormChange}
      onPermissionFormChange={onPermissionFormChange}
      onValidateNode={onValidateNode}
      onCreateNode={onCreateNode}
      onLoadNodeInventory={onLoadNodeInventory}
      onSelectAdminUser={onSelectAdminUser}
      onAssignPermission={onAssignPermission}
    />,
  )

  return { onLoadNodeInventory, onPermissionFormChange }
}

afterEach(() => {
  cleanup()
})

describe('AdminConsole', () => {
  it('calls inventory loader when clicking a node', () => {
    const { onLoadNodeInventory } = renderAdminConsole()

    fireEvent.click(screen.getByRole('button', { name: /node-a/i }))

    expect(onLoadNodeInventory).toHaveBeenCalledWith(7)
  })

  it('writes vmid back to permission form when clicking an inventory vm', () => {
    const { onPermissionFormChange } = renderAdminConsole()

    fireEvent.click(screen.getByText(/vmid 101 · vm-101/i))

    expect(onPermissionFormChange).toHaveBeenCalled()
    const updater = onPermissionFormChange.mock.calls.at(-1)?.[0] as (prev: { user_id: string; pve_node_id: string; vmid: string }) => { user_id: string; pve_node_id: string; vmid: string }
    expect(updater({ user_id: '3', pve_node_id: '7', vmid: '' }).vmid).toBe('101')
  })

  it('keeps save-node button disabled when validation does not allow save', () => {
    render(
      <AdminConsole
        submitting={false}
        adminUsers={[]}
        nodes={[]}
        permissions={[]}
        selectedAdminUserId={null}
        validationResult={null}
        selectedNodeInventory={null}
        nodeForm={{ api_base_url: '', token_id: '', token_secret: '', selected_version: '8.2.2' }}
        permissionForm={{ user_id: '', pve_node_id: '', vmid: '' }}
        onNodeFormChange={vi.fn()}
        onPermissionFormChange={vi.fn()}
        onValidateNode={vi.fn(async () => {})}
        onCreateNode={vi.fn(async () => {})}
        onLoadNodeInventory={vi.fn(async () => {})}
        onSelectAdminUser={vi.fn(async () => {})}
        onAssignPermission={vi.fn(async () => {})}
      />,
    )

    expect(screen.getAllByRole('button', { name: '保存节点' })[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: '分配 KVM 权限' })).toBeDisabled()
  })
})
