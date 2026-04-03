import { AlertCircle, UserCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
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

export function AppShell({
  user,
  kvmsCount,
  pathname,
  mustChangePasswordBanner,
  pageMessage,
  adminError,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">轻量级 PVE 管理系统</div>
            <div className="text-sm text-slate-500">shadcn 风格基础界面已接入后端 API</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">{user.username}</div>
              <div className="text-xs text-slate-500">{user.role === 'admin' ? '管理员' : '用户'}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <Button asChild variant="outline"><Link to="/kvms">KVM 列表</Link></Button>
            {user.role === 'admin' ? <Button asChild variant="outline"><Link to="/admin">节点与授权</Link></Button> : null}
            {user.role === 'admin' ? <Button asChild variant="outline"><Link to="/admin/users">用户管理</Link></Button> : null}
            <Button asChild variant="outline"><Link to="/password">修改密码</Link></Button>
            <Button variant="outline" onClick={onLogout}>退出</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        {mustChangePasswordBanner ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 pt-6 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{mustChangePasswordBanner}</span>
            </CardContent>
          </Card>
        ) : null}

        {pageMessage ? <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{pageMessage}</div> : null}
        {adminError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adminError}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardDescription>当前身份</CardDescription><CardTitle>{user.role === 'admin' ? '管理员' : '普通用户'}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>可管理 KVM 数量</CardDescription><CardTitle>{kvmsCount}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>当前路由</CardDescription><CardTitle>{pathname}</CardTitle></CardHeader></Card>
        </section>

        {children}
      </main>
    </div>
  )
}
