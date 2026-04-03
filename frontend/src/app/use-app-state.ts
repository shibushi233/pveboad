import type { NavigateFunction } from 'react-router-dom'

import { useAdminState } from './use-admin-state'
import { useAuthState } from './use-auth-state'
import { useKvmState } from './use-kvm-state'

type UseAppStateParams = {
  navigate: NavigateFunction
  pathname: string
}

export function useAppState({ navigate, pathname }: UseAppStateParams) {
  const kvm = useKvmState()
  const admin = useAdminState()

  const auth = useAuthState({
    navigate,
    pathname,
    onAfterLogin: async (user) => {
      await kvm.loadForUser(user)
      await admin.loadForUser(user)
    },
  })

  async function handleLogout() {
    await auth.handleLogout(() => {
      kvm.resetKvmState()
      admin.resetAdminState()
    })
  }

  return {
    user: auth.user,
    loading: auth.loading,
    submitting: auth.submitting,
    error: auth.error,
    pageMessage: auth.pageMessage,
    loginForm: auth.loginForm,
    passwordForm: auth.passwordForm,
    mustChangePasswordBanner: auth.mustChangePasswordBanner,
    setLoginForm: auth.setLoginForm,
    setPasswordForm: auth.setPasswordForm,
    kvms: kvm.kvms,
    selectedKvm: kvm.selectedKvm,
    detailLoading: kvm.detailLoading,
    detail: kvm.detail,
    metrics: kvm.metrics,
    monitoring: kvm.monitoring,
    timeframe: kvm.timeframe,
    vncBootstrap: kvm.vncBootstrap,
    detailError: kvm.detailError,
    actionLoading: kvm.actionLoading,
    nodeForm: admin.nodeForm,
    permissionForm: admin.permissionForm,
    adminUsers: admin.adminUsers,
    nodes: admin.nodes,
    permissions: admin.permissions,
    selectedAdminUserId: admin.selectedAdminUserId,
    validationResult: admin.validationResult,
    selectedNodeInventory: admin.selectedNodeInventory,
    adminError: admin.adminError,
    setNodeForm: admin.setNodeForm,
    setPermissionForm: admin.setPermissionForm,
    handleLogin: auth.handleLogin,
    handleLogout,
    loadKvmWorkspaceByIds: (nodeId: number, vmid: number, timeframe?: 'day' | 'week') => kvm.loadKvmWorkspaceByIds(nodeId, vmid, timeframe, () => auth.setPageMessage(null)),
    handleKvmAction: (action: 'start' | 'shutdown' | 'stop') => kvm.handleKvmAction(action, auth.setPageMessage),
    handleChangePassword: auth.handleChangePassword,
    handleValidateNode: (event: React.FormEvent) => admin.handleValidateNode(event, auth.setSubmitting, auth.setPageMessage),
    handleCreateNode: () => admin.handleCreateNode(auth.setSubmitting, auth.setPageMessage),
    handleLoadNodeInventory: (nodeId: number) => admin.handleLoadNodeInventory(nodeId, auth.setPageMessage),
    handleSelectAdminUser: admin.handleSelectAdminUser,
    handleAssignPermission: (event: React.FormEvent) => admin.handleAssignPermission(event, auth.setSubmitting, auth.setPageMessage),
    handleCreateAdminUser: (payload: import('../types/api').AdminUserCreateRequest) => admin.handleCreateAdminUser(payload, auth.setSubmitting, auth.setPageMessage),
    handleToggleAdminUserStatus: (userId: number, isActive: boolean) => admin.handleToggleAdminUserStatus(userId, isActive, auth.setSubmitting, auth.setPageMessage),
  }
}
