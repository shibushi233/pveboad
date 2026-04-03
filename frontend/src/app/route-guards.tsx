import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { UserSummary } from '../types/api'

type GuestRouteProps = {
  user: UserSummary | null
  needsSetup?: boolean
  children: ReactNode
}

export function GuestRoute({ user, needsSetup, children }: GuestRouteProps) {
  if (user) {
    return <Navigate to={user.must_change_password ? '/password' : '/kvms'} replace />
  }
  if (needsSetup) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

type ProtectedRouteProps = {
  user: UserSummary | null
  needsSetup?: boolean
  children: ReactNode
}

export function ProtectedRoute({ user, needsSetup, children }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to={needsSetup ? '/setup' : '/login'} replace />
  }

  return <>{children}</>
}

type SetupRouteProps = {
  user: UserSummary | null
  needsSetup: boolean
  children: ReactNode
}

export function SetupRoute({ user, needsSetup, children }: SetupRouteProps) {
  if (user) {
    return <Navigate to={user.must_change_password ? '/password' : '/kvms'} replace />
  }
  if (!needsSetup) {
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
