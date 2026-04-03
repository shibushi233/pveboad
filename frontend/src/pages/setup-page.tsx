import { FormEvent } from 'react'
import { Settings } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type SetupForm = { username: string; password: string; confirm_password: string }

type SetupPageProps = {
  setupForm: SetupForm
  submitting: boolean
  error: string | null
  onSetupFormChange: (value: SetupForm | ((prev: SetupForm) => SetupForm)) => void
  onSubmit: (event: FormEvent) => Promise<void>
}

export function SetupPage({ setupForm, submitting, error, onSetupFormChange, onSubmit }: SetupPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md border-slate-200 bg-white">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-soft">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>初始化管理系统</CardTitle>
            <CardDescription>首次使用，请创建管理员账号以开始使用系统。</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入管理员用户名"
                value={setupForm.username}
                onChange={(event) => onSetupFormChange((prev) => ({ ...prev, username: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码（至少8位）"
                value={setupForm.password}
                onChange={(event) => onSetupFormChange((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">确认密码</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="请再次输入密码"
                value={setupForm.confirm_password}
                onChange={(event) => onSetupFormChange((prev) => ({ ...prev, confirm_password: event.target.value }))}
              />
            </div>
            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? '创建中...' : '创建管理员账号'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
