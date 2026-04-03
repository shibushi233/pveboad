import { FormEvent } from 'react'
import { Shield } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type LoginPageProps = {
  loginForm: { username: string; password: string }
  submitting: boolean
  error: string | null
  onLoginFormChange: (value: { username: string; password: string } | ((prev: { username: string; password: string }) => { username: string; password: string })) => void
  onSubmit: (event: FormEvent) => Promise<void>
}

export function LoginPage({ loginForm, submitting, error, onLoginFormChange, onSubmit }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md border-slate-200 bg-white">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-soft">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>登录轻量级 PVE 管理系统</CardTitle>
            <CardDescription>界面风格按 ui.shadcn.com 方向搭建，当前已接入基础登录流程。</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={loginForm.username}
                onChange={(event) => onLoginFormChange((prev) => ({ ...prev, username: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={loginForm.password}
                onChange={(event) => onLoginFormChange((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
