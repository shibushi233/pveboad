import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { UserSummary } from '../types/api'

type GuestRouteProps = {
  user: UserSummary | null
  children: ReactNode
}

export function GuestRoute({ user, children }: GuestRouteProps) {
  if (user) {
    return <Navigate to={user.must_change_password ? '/password' : '/kvms'} replace />
  }

  return <>{children}</>
}

type ProtectedRouteProps = {
  user: UserSummary | null
  children: ReactNode
}

export function ProtectedRoute({ user, children }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

type AdminRouteProps = {
  user: UserSummary
  children: ReactNode
}

export function AdminRoute({ user, children }: AdminRouteProps) {
  if (user.role !== 'admin') {
    return <Navigate to="/kvms" replace />
  }

  return <>{children}</>
}
