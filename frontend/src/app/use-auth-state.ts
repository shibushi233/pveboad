import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'

import { apiFetch } from '../lib/api'
import type { LoginResponse, SetupStatusResponse, UserSummary } from '../types/api'

type SetupForm = { username: string; password: string; confirm_password: string }

type UseAuthStateParams = {
  navigate: NavigateFunction
  pathname: string
  onAfterLogin?: (user: UserSummary) => Promise<void>
}

export function useAuthState({ navigate, pathname, onAfterLogin }: UseAuthStateParams) {
  const [user, setUser] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupForm, setSetupForm] = useState<SetupForm>({ username: '', password: '', confirm_password: '' })

  async function loadSession() {
    setLoading(true)
    try {
      const me = await apiFetch<UserSummary>('/auth/me')
      setUser(me)
      setError(null)
      if (onAfterLogin) {
        await onAfterLogin(me)
      }
    } catch {
      setUser(null)
      try {
        const status = await apiFetch<SetupStatusResponse>('/auth/setup-status')
        setNeedsSetup(status.needs_setup)
      } catch {
        setNeedsSetup(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSession()
  }, [])

  useEffect(() => {
    if (loading) return
    if (needsSetup && pathname !== '/setup') {
      navigate('/setup', { replace: true })
    }
  }, [needsSetup, loading, pathname, navigate])

  useEffect(() => {
    if (!user) return
    if (user.must_change_password && pathname !== '/password') {
      navigate('/password', { replace: true })
    }
  }, [user, pathname, navigate])

  async function handleSetup(event: FormEvent) {
    event.preventDefault()
    if (setupForm.password !== setupForm.confirm_password) {
      setError('两次输入的密码不一致')
      return
    }
    if (setupForm.password.length < 8) {
      setError('密码长度至少为8位')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/auth/bootstrap-admin', {
        method: 'POST',
        body: JSON.stringify({ username: setupForm.username, password: setupForm.password }),
      })
      setNeedsSetup(false)
      setError(null)
      await loadSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(loginForm) })
      setUser(result.user)
      setError(null)
      setPageMessage(result.message)
      if (onAfterLogin) {
        await onAfterLogin(result.user)
      }
      navigate(result.user.must_change_password ? '/password' : '/kvms')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout(onAfterLogout?: () => void) {
    await apiFetch('/auth/logout', { method: 'POST' })
    setUser(null)
    setPageMessage(null)
    onAfterLogout?.()
    navigate('/login')
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPageMessage('两次输入的新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      const nextUser = await apiFetch<UserSummary>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: passwordForm.current_password, new_password: passwordForm.new_password }),
      })
      setUser(nextUser)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setPageMessage('密码修改成功')
      setError(null)
      navigate('/kvms')
    } catch (err) {
      setPageMessage(err instanceof Error ? err.message : '密码修改失败')
    } finally {
      setSubmitting(false)
    }
  }

  const mustChangePasswordBanner = useMemo(() => (user?.must_change_password ? '当前账号首次登录后必须先修改密码，再继续使用管理能力。' : null), [user])

  return {
    user,
    loading,
    submitting,
    error,
    pageMessage,
    loginForm,
    passwordForm,
    needsSetup,
    setupForm,
    mustChangePasswordBanner,
    setLoginForm,
    setPasswordForm,
    setSetupForm,
    setPageMessage,
    setSubmitting,
    setError,
    handleLogin,
    handleLogout,
    handleChangePassword,
    handleSetup,
  }
}
