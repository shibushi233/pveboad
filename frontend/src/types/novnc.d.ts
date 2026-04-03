declare module '@novnc/novnc/lib/rfb' {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, urlOrChannel: string, options?: Record<string, unknown>)
    scaleViewport: boolean
    resizeSession: boolean
    focusOnClick: boolean
    clipViewport: boolean
    background: string
    disconnect(): void
    sendCtrlAltDel(): void
    clipboardPasteFrom(text: string): void
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void
  }
}
