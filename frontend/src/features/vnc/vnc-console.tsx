import { useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard, Maximize, Minimize, MonitorX, Send } from 'lucide-react'
import RFB from '@novnc/novnc/lib/rfb'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import type { VNCBootstrap } from '../../types/api'

type VNCConsoleProps = {
  bootstrap: VNCBootstrap | null
  title: string
}

export function VNCConsole({ bootstrap, title }: VNCConsoleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rfbRef = useRef<RFB | null>(null)
  const [clipboardText, setClipboardText] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('未连接')
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const websocketUrl = useMemo(() => {
    if (!bootstrap?.websocket_url) return null
    if (bootstrap.websocket_url.startsWith('ws://') || bootstrap.websocket_url.startsWith('wss://')) return bootstrap.websocket_url
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${bootstrap.websocket_url}`
  }, [bootstrap])

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement
      const nextFullscreen = fullscreenElement === target
      setIsFullscreen(nextFullscreen)
      setActionStatus(nextFullscreen ? '已进入全屏' : null)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    setActionStatus(null)
    setConnected(false)
    setConnectionStatus(websocketUrl ? '连接中...' : '控制台暂不可用')

    const target = containerRef.current
    if (!target || !websocketUrl) {
      rfbRef.current = null
      return
    }

    const rfb = new RFB(target, websocketUrl)
    rfb.scaleViewport = true
    rfb.resizeSession = true
    rfb.focusOnClick = true
    rfb.clipViewport = false
    rfb.background = 'rgb(15, 23, 42)'
    rfbRef.current = rfb

    const handleConnect = () => {
      setConnected(true)
      setConnectionStatus('已连接')
      setActionStatus(null)
    }
    const handleDisconnect = (event: Event) => {
      const detail = (event as CustomEvent<{ clean?: boolean }>).detail
      setConnected(false)
      setConnectionStatus(detail?.clean ? '连接已断开' : '连接异常中断')
    }
    const handleClipboard = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string }>).detail
      setClipboardText(detail?.text ?? '')
      setActionStatus('已收到远端剪贴板内容')
    }

    rfb.addEventListener('connect', handleConnect)
    rfb.addEventListener('disconnect', handleDisconnect)
    rfb.addEventListener('clipboard', handleClipboard)

    return () => {
      rfb.removeEventListener('connect', handleConnect)
      rfb.removeEventListener('disconnect', handleDisconnect)
      rfb.removeEventListener('clipboard', handleClipboard)
      rfb.disconnect()
      rfbRef.current = null
      setConnected(false)
    }
  }, [websocketUrl])

  async function handleFullscreen() {
    if (!containerRef.current) return
    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen()
        setActionStatus('已退出全屏')
        return
      }
      await containerRef.current.requestFullscreen()
    } catch {
      setActionStatus('进入全屏失败')
    }
  }

  async function handleReadClipboard() {
    if (!navigator.clipboard?.readText) {
      setActionStatus('当前浏览器不支持读取剪贴板')
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      setClipboardText(text)
      setActionStatus('已读取本地剪贴板')
    } catch {
      setActionStatus('浏览器不允许读取剪贴板')
    }
  }

  function handlePasteClipboard() {
    if (!rfbRef.current) return
    rfbRef.current.clipboardPasteFrom(clipboardText)
    setActionStatus('已发送剪贴板到远端')
  }

  function handleCtrlAltDel() {
    if (!rfbRef.current) return
    rfbRef.current.sendCtrlAltDel()
    setActionStatus('已发送 Ctrl+Alt+Del')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>嵌入式控制台</CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button disabled={!bootstrap?.websocket_url} type="button" variant="outline" onClick={() => void handleFullscreen()}>
            {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
          <Button disabled={!connected} type="button" variant="outline" onClick={() => void handleReadClipboard()}>
            <Clipboard className="mr-2 h-4 w-4" />
            读取本地剪贴板
          </Button>
          <Button disabled={!connected} type="button" variant="outline" onClick={handlePasteClipboard}>
            <Send className="mr-2 h-4 w-4" />
            发送剪贴板
          </Button>
          <Button disabled={!connected} type="button" variant="outline" onClick={handleCtrlAltDel}>
            <MonitorX className="mr-2 h-4 w-4" />
            Ctrl+Alt+Del
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600">引导：{bootstrap?.message ?? '未获取到控制台引导信息'}</div>
          <div className="text-sm text-slate-600">连接状态：{connectionStatus}</div>
          {actionStatus ? <div className="text-sm text-slate-600">操作反馈：{actionStatus}</div> : null}
          <Input value={clipboardText} onChange={(event) => setClipboardText(event.target.value)} placeholder="可读取本地剪贴板，或直接输入后发送到远端" />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
          <div ref={containerRef} className="h-[520px] w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
