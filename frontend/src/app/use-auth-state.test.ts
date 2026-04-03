import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '../lib/api'
import { useAuthState } from './use-auth-state'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('useAuthState', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
  })

  it('redirects first-login users to password page after loading session', async () => {
    const navigate = vi.fn()
    mockedApiFetch.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'admin', must_change_password: true, is_active: true })

    renderHook(() => useAuthState({ navigate, pathname: '/kvms' }))

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/password', { replace: true })
    })
  })

  it('logs in and navigates to kvms for normal users', async () => {
    const navigate = vi.fn()
    mockedApiFetch
      .mockRejectedValueOnce(new Error('未登录'))
      .mockResolvedValueOnce({
        message: '登录成功',
        user: { id: 2, username: 'user1', role: 'user', must_change_password: false, is_active: true },
      })

    const onAfterLogin = vi.fn(async () => {})
    const { result } = renderHook(() => useAuthState({ navigate, pathname: '/login', onAfterLogin }))

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      result.current.setLoginForm({ username: 'user1', password: 'password123' })
    })

    await act(async () => {
      await result.current.handleLogin({ preventDefault() {} } as React.FormEvent)
    })

    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'user1', password: 'password123' }),
    })
    expect(onAfterLogin).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/kvms')
  })

  it('blocks password change when confirmation does not match', async () => {
    const navigate = vi.fn()
    mockedApiFetch.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'admin', must_change_password: true, is_active: true })

    const { result } = renderHook(() => useAuthState({ navigate, pathname: '/password' }))

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      result.current.setPasswordForm({ current_password: 'old', new_password: 'new-a', confirm_password: 'new-b' })
    })

    await act(async () => {
      await result.current.handleChangePassword({ preventDefault() {} } as React.FormEvent)
    })

    expect(result.current.pageMessage).toBe('两次输入的新密码不一致')
    expect(mockedApiFetch).toHaveBeenCalledTimes(1)
  })
})
