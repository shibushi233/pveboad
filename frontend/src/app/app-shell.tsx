import { useState, useRef, useEffect, type ReactNode } from 'react'
import { AlertCircle, ChevronDown, LogOut, Settings, UserCircle2, KeyRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import type { UserSummary } from '../types/api'

type AppShellProps = {
  user: UserSummary
  kvmsCount: number
  pathname: string
  mustChangePasswordBanner: string | null
  pageMessage: string | null
  adminError: string | null
  onLogout: () => void
  children: ReactNode
}

function UserMenu({ user, onLogout }: { user: UserSummary; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
          <UserCircle2 className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-slate-700">{user.username}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            to="/password"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <KeyRound className="h-4 w-4" />
            修改密码
          </Link>
          {user.role === 'admin' ? (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />
              管理设置
            </Link>
          ) : null}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { setOpen(false); onLogout() }}
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({
  user,
  mustChangePasswordBanner,
  pageMessage,
  adminError,
  onLogout,
  children,
}: AppShellProps) {
  const location = useLocation()
  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/kvms" className="text-lg font-semibold text-slate-900 hover:text-slate-700">PVE 管理系统</Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                to="/kvms"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${location.pathname.startsWith('/kvms') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                KVM 列表
              </Link>
              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${location.pathname === '/admin' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    节点与授权
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${location.pathname === '/admin/users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    用户管理
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {mustChangePasswordBanner ? (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 pt-6 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{mustChangePasswordBanner}</span>
            </CardContent>
          </Card>
        ) : null}

        {pageMessage ? <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{pageMessage}</div> : null}
        {adminError ? <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adminError}</div> : null}

        {children}
      </main>
    </div>
  )
}
