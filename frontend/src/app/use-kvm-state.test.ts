import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '../lib/api'
import { useKvmState } from './use-kvm-state'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('useKvmState', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
  })

  it('loads detail workspace including vnc bootstrap', async () => {
    const { result } = renderHook(() => useKvmState())

    mockedApiFetch
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, vm_type: 'qemu', name: 'vm-101', status: 'running', cpu: 0.1, maxmem: 1024, maxdisk: 2048 })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, status: 'running', cpu: 0.2, mem: 512, maxmem: 1024, disk: 256, maxdisk: 2048, uptime: 10 })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', timeframe: 'day', points: [] })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, websocket_url: '/api/user/kvms/7/101/vnc/ws', password: null, message: 'ok' })

    await act(async () => {
      await result.current.loadKvmWorkspaceByIds(7, 101, 'day')
    })

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, '/user/kvms/7/101')
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/user/kvms/7/101/metrics/current')
    expect(mockedApiFetch).toHaveBeenNthCalledWith(3, '/user/nodes/7/metrics/day')
    expect(mockedApiFetch).toHaveBeenNthCalledWith(4, '/user/kvms/7/101/vnc')
    expect(result.current.vncBootstrap?.websocket_url).toBe('/api/user/kvms/7/101/vnc/ws')
  })

  it('stores detail error when workspace loading fails', async () => {
    const { result } = renderHook(() => useKvmState())

    mockedApiFetch.mockRejectedValueOnce(new Error('加载失败'))

    await act(async () => {
      await result.current.loadKvmWorkspaceByIds(7, 101, 'day')
    })

    expect(result.current.detailError).toBe('加载失败')
    expect(result.current.detail).toBeNull()
    expect(result.current.metrics).toBeNull()
    expect(result.current.monitoring).toBeNull()
    expect(result.current.vncBootstrap).toBeNull()
    expect(result.current.detailLoading).toBe(false)
  })

  it('clears stale workspace state before loading another kvm', async () => {
    const { result } = renderHook(() => useKvmState())

    await act(async () => {
      result.current.resetKvmState()
    })

    mockedApiFetch
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, vm_type: 'qemu', name: 'vm-101', status: 'running', cpu: 0.1, maxmem: 1024, maxdisk: 2048 })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, status: 'running', cpu: 0.2, mem: 512, maxmem: 1024, disk: 256, maxdisk: 2048, uptime: 10 })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', timeframe: 'day', points: [] })
      .mockResolvedValueOnce({ node_id: 7, node_name: 'node-a', vmid: 101, websocket_url: '/api/user/kvms/7/101/vnc/ws', password: null, message: 'ok' })

    await act(async () => {
      await result.current.loadKvmWorkspaceByIds(7, 101, 'day')
    })

    mockedApiFetch.mockReset()
    mockedApiFetch.mockRejectedValueOnce(new Error('第二台加载失败'))

    await act(async () => {
      await result.current.loadKvmWorkspaceByIds(8, 202, 'week')
    })

    expect(result.current.detail).toBeNull()
    expect(result.current.metrics).toBeNull()
    expect(result.current.monitoring).toBeNull()
    expect(result.current.vncBootstrap).toBeNull()
    expect(result.current.detailError).toBe('第二台加载失败')
  })
})
