import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'

import { AdminRoute, GuestRoute, ProtectedRoute } from './route-guards'

describe('route guards', () => {
  it('redirects guest route authenticated users with forced password change', () => {
    render(
      <MemoryRouter>
        <GuestRoute user={{ id: 1, username: 'admin', role: 'admin', must_change_password: true, is_active: true }}>
          <div>guest content</div>
        </GuestRoute>
      </MemoryRouter>,
    )

    expect(screen.queryByText('guest content')).not.toBeInTheDocument()
  })

  it('redirects protected route unauthenticated users', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute user={null}>
          <div>protected content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('blocks non-admin users from admin route', () => {
    render(
      <MemoryRouter>
        <AdminRoute user={{ id: 2, username: 'user1', role: 'user', must_change_password: false, is_active: true }}>
          <div>admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    )

    expect(screen.queryByText('admin content')).not.toBeInTheDocument()
  })
})
