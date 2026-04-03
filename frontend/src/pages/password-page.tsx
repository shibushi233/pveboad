import { FormEvent } from 'react'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type PasswordPageProps = {
  passwordForm: { current_password: string; new_password: string; confirm_password: string }
  submitting: boolean
  onPasswordFormChange: (value: { current_password: string; new_password: string; confirm_password: string } | ((prev: { current_password: string; new_password: string; confirm_password: string }) => { current_password: string; new_password: string; confirm_password: string })) => void
  onSubmit: (event: FormEvent) => Promise<void>
  onBack: () => void
}

export function PasswordPage({ passwordForm, submitting, onPasswordFormChange, onSubmit, onBack }: PasswordPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>修改登录密码</CardTitle>
        <CardDescription>首次登录用户必须完成改密，普通用户也可随时修改。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:max-w-xl" onSubmit={(event) => void onSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="current_password">当前密码</Label>
            <Input
              id="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={(event) => onPasswordFormChange((prev) => ({ ...prev, current_password: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">新密码</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordForm.new_password}
              onChange={(event) => onPasswordFormChange((prev) => ({ ...prev, new_password: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">确认新密码</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordForm.confirm_password}
              onChange={(event) => onPasswordFormChange((prev) => ({ ...prev, confirm_password: event.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <Button disabled={submitting} type="submit">{submitting ? '提交中...' : '保存新密码'}</Button>
            <Button type="button" variant="outline" onClick={onBack}>返回列表</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
