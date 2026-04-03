import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { VNCConsole } from './vnc-console'

class MockRFB extends EventTarget {
  scaleViewport = false
  resizeSession = false
  focusOnClick = false
  clipViewport = false
  background = ''
  disconnect = vi.fn()
  sendCtrlAltDel = vi.fn()
  clipboardPasteFrom = vi.fn()

  constructor(public target: HTMLElement, public url: string) {
    super()
  }
}

const rfbInstances: MockRFB[] = []

vi.mock('@novnc/novnc/lib/rfb', () => ({
  default: vi.fn((target: HTMLElement, url: string) => {
    const instance = new MockRFB(target, url)
    rfbInstances.push(instance)
    return instance
  }),
}))

const bootstrap = {
  node_id: 7,
  node_name: 'node-a',
  vmid: 101,
  websocket_url: '/api/user/kvms/7/101/vnc/ws',
  password: null,
  message: 'VNC 控制台引导信息获取成功',
}

describe('VNCConsole', () => {
  beforeEach(() => {
    rfbInstances.length = 0
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { protocol: 'https:', host: 'panel.example' },
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          writable: true,
          value: null,
        })
        document.dispatchEvent(new Event('fullscreenchange'))
      }),
    })
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async function (this: HTMLElement) {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          writable: true,
          value: this,
        })
        document.dispatchEvent(new Event('fullscreenchange'))
      }),
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: vi.fn(async () => 'local text'),
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders unavailable state when websocket bootstrap is missing', () => {
    render(<VNCConsole bootstrap={{ ...bootstrap, websocket_url: null }} title="node-a / VMID 101" />)

    expect(screen.getByRole('button', { name: '全屏' })).toBeDisabled()
    expect(screen.getByText(/连接状态：控制台暂不可用/)).toBeInTheDocument()
  })

  it('updates status on connect and clipboard events', async () => {
    render(<VNCConsole bootstrap={bootstrap} title="node-a / VMID 101" />)

    const rfb = rfbInstances[0]
    expect(rfb.url).toBe('wss://panel.example/api/user/kvms/7/101/vnc/ws')

    rfb.dispatchEvent(new Event('connect'))
    rfb.dispatchEvent(new CustomEvent('clipboard', { detail: { text: 'remote text' } }))

    await waitFor(() => {
      expect(screen.getByText(/连接状态：已连接/)).toBeInTheDocument()
      expect(screen.getByDisplayValue('remote text')).toBeInTheDocument()
      expect(screen.getByText(/操作反馈：已收到远端剪贴板内容/)).toBeInTheDocument()
    })
  })

  it('reads local clipboard and sends clipboard plus ctrl alt del when connected', async () => {
    render(<VNCConsole bootstrap={bootstrap} title="node-a / VMID 101" />)

    const rfb = rfbInstances[0]
    rfb.dispatchEvent(new Event('connect'))

    await waitFor(() => {
      expect(screen.getByText(/连接状态：已连接/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '读取本地剪贴板' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('local text')).toBeInTheDocument()
      expect(screen.getByText(/操作反馈：已读取本地剪贴板/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '发送剪贴板' }))
    expect(rfb.clipboardPasteFrom).toHaveBeenCalledWith('local text')
    expect(screen.getByText(/操作反馈：已发送剪贴板到远端/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ctrl+Alt+Del' }))
    expect(rfb.sendCtrlAltDel).toHaveBeenCalled()
    expect(screen.getByText(/操作反馈：已发送 Ctrl\+Alt\+Del/)).toBeInTheDocument()
  })

  it('toggles fullscreen button label', async () => {
    render(<VNCConsole bootstrap={bootstrap} title="node-a / VMID 101" />)

    fireEvent.click(screen.getByRole('button', { name: '全屏' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '退出全屏' })).toBeInTheDocument()
      expect(screen.getByText(/操作反馈：已进入全屏/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '退出全屏' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '全屏' })).toBeInTheDocument()
    })
  })
})
