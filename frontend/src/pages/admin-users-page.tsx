import type { AdminUserCreateRequest, AdminUserItem } from '../types/api'
import { AdminUserManagement } from '../features/admin/admin-user-management'

type AdminUsersPageProps = {
  users: AdminUserItem[]
  submitting: boolean
  currentAdminId: number
  onCreateUser: (payload: AdminUserCreateRequest) => Promise<void>
  onToggleUserStatus: (userId: number, isActive: boolean) => Promise<void>
}

export function AdminUsersPage(props: AdminUsersPageProps) {
  return <AdminUserManagement {...props} />
}
