import { FormEvent, useMemo, useState } from 'react'
import { ShieldCheck, UserPlus, Users } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import type { AdminUserCreateRequest, AdminUserItem } from '../../types/api'

type AdminUserManagementProps = {
  users: AdminUserItem[]
  submitting: boolean
  currentAdminId: number
  onCreateUser: (payload: AdminUserCreateRequest) => Promise<void>
  onToggleUserStatus: (userId: number, isActive: boolean) => Promise<void>
}

export function AdminUserManagement({ users, submitting, currentAdminId, onCreateUser, onToggleUserStatus }: AdminUserManagementProps) {
  const [form, setForm] = useState<AdminUserCreateRequest>({ username: '', password: '', role: 'user' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localMessage, setLocalMessage] = useState<string | null>(null)

  const admins = useMemo(() => users.filter((item) => item.role === 'admin'), [users])
  const normalUsers = useMemo(() => users.filter((item) => item.role === 'user'), [users])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.password !== confirmPassword) {
      setLocalMessage('两次输入的密码不一致')
      return
    }
    await onCreateUser(form)
    setForm({ username: '', password: '', role: 'user' })
    setConfirmPassword('')
    setLocalMessage('用户创建成功')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <CardTitle>创建用户</CardTitle>
            </div>
            <CardDescription>独立管理员用户页：支持创建普通用户或管理员。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="admin_user_username">用户名</Label>
                <Input id="admin_user_username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_user_role">角色</Label>
                <select
                  id="admin_user_role"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as 'admin' | 'user' }))}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_user_password">初始密码</Label>
                <Input id="admin_user_password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_user_confirm_password">确认密码</Label>
                <Input id="admin_user_confirm_password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              {localMessage ? <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{localMessage}</div> : null}
              <Button disabled={submitting} type="submit">{submitting ? '创建中...' : '创建用户'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle>管理员列表</CardTitle>
            </div>
            <CardDescription>管理员账号仅展示，不在这里做禁用保护绕过。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {admins.length ? (
              admins.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="font-medium text-slate-900">{item.username}</div>
                  <div className="mt-1 text-slate-500">ID: {item.id} / 状态: {item.is_active ? '启用' : '禁用'} / {item.must_change_password ? '首次登录需改密' : '已改密'}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">暂无管理员账号。</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>普通用户管理</CardTitle>
          </div>
          <CardDescription>启用/禁用普通用户；当前登录管理员不在此列表中。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {normalUsers.length ? (
            normalUsers.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                <div>
                  <div className="font-medium text-slate-900">{item.username}</div>
                  <div className="mt-1 text-slate-500">ID: {item.id} / {item.must_change_password ? '首次登录需改密' : '已改密'} / 当前状态: {item.is_active ? '启用' : '禁用'}</div>
                </div>
                <Button
                  disabled={submitting || item.id === currentAdminId}
                  type="button"
                  variant={item.is_active ? 'outline' : 'default'}
                  onClick={() => void onToggleUserStatus(item.id, !item.is_active)}
                >
                  {item.is_active ? '禁用用户' : '启用用户'}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-slate-500">暂无普通用户。</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
