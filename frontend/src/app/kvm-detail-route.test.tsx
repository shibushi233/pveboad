import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../features/vnc/vnc-console', () => ({
  VNCConsole: ({ title }: { title: string }) => <div>mock vnc {title}</div>,
}))

import { KvmDetailRoute } from './kvm-detail-route'

const baseProps = {
  kvms: [{ node_id: 7, node_name: 'node-a', vmid: 101, vm_type: 'qemu', name: 'vm-101', status: 'running', cpu: 0.1, maxmem: 1024, maxdisk: 2048 }],
  loadKvmWorkspaceByIds: vi.fn(async () => {}),
  selectedKvm: null,
  detailLoading: false,
  detailError: null,
  detail: null,
  metrics: null,
  monitoring: null,
  timeframe: 'day' as const,
  vncBootstrap: null,
  actionLoading: null,
  onBack: vi.fn(),
  onRefresh: vi.fn(),
  onAction: vi.fn(),
  formatPercent: vi.fn(() => '10%'),
  formatBytes: vi.fn(() => '1 GiB'),
  formatSeconds: vi.fn(() => '10s'),
  metricSummary: vi.fn(() => 'summary'),
}

describe('KvmDetailRoute', () => {
  it('loads workspace from route params', async () => {
    const loadKvmWorkspaceByIds = vi.fn(async () => {})

    render(
      <MemoryRouter initialEntries={['/kvms/7/101']}>
        <Routes>
          <Route path="/kvms/:nodeId/:vmid" element={<KvmDetailRoute {...baseProps} loadKvmWorkspaceByIds={loadKvmWorkspaceByIds} />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(loadKvmWorkspaceByIds).toHaveBeenCalledWith(7, 101, 'day')
    })
    expect(screen.getByText(/节点 node-a \/ VMID 101/)).toBeInTheDocument()
  })
})
