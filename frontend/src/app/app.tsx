import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { AppShell } from './app-shell'
import { AdminRoute, GuestRoute, ProtectedRoute } from './route-guards'
import { useAppState } from './use-app-state'
import { formatBytes, formatPercent, formatSeconds, metricSummary } from '../lib/format'

const KvmDetailRoute = lazy(async () => import('./kvm-detail-route').then((module) => ({ default: module.KvmDetailRoute })))
const AdminPage = lazy(async () => import('../pages/admin-page').then((module) => ({ default: module.AdminPage })))
const AdminUsersPage = lazy(async () => import('../pages/admin-users-page').then((module) => ({ default: module.AdminUsersPage })))
const KvmListPage = lazy(async () => import('../pages/kvm-list-page').then((module) => ({ default: module.KvmListPage })))
const LoginPage = lazy(async () => import('../pages/login-page').then((module) => ({ default: module.LoginPage })))
const PasswordPage = lazy(async () => import('../pages/password-page').then((module) => ({ default: module.PasswordPage })))

function RouteFallback() {
  return <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">页面加载中...</div>
}

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    user,
    kvms,
    loading,
    submitting,
    error,
    pageMessage,
    loginForm,
    passwordForm,
    nodeForm,
    permissionForm,
    selectedKvm,
    detailLoading,
    detail,
    metrics,
    monitoring,
    timeframe,
    vncBootstrap,
    detailError,
    actionLoading,
    adminUsers,
    nodes,
    permissions,
    selectedAdminUserId,
    validationResult,
    selectedNodeInventory,
    adminError,
    mustChangePasswordBanner,
    setLoginForm,
    setPasswordForm,
    setNodeForm,
    setPermissionForm,
    handleLogin,
    handleLogout,
    loadKvmWorkspaceByIds,
    handleKvmAction,
    handleChangePassword,
    handleValidateNode,
    handleCreateNode,
    handleLoadNodeInventory,
    handleSelectAdminUser,
    handleAssignPermission,
    handleCreateAdminUser,
    handleToggleAdminUserStatus,
  } = useAppState({ navigate, pathname: location.pathname })

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /><span>正在加载系统状态...</span></div></div>
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute user={user}>
            <Suspense fallback={<RouteFallback />}>
              <LoginPage
                loginForm={loginForm}
                submitting={submitting}
                error={error}
                onLoginFormChange={setLoginForm}
                onSubmit={handleLogin}
              />
            </Suspense>
          </GuestRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute user={user}>
            <AppShell
              user={user!}
              kvmsCount={kvms.length}
              pathname={location.pathname}
              mustChangePasswordBanner={mustChangePasswordBanner}
              pageMessage={pageMessage}
              adminError={adminError}
              onLogout={() => void handleLogout()}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/kvms" replace />} />
                <Route
                  path="/kvms"
                  element={<Suspense fallback={<RouteFallback />}><KvmListPage kvms={kvms} error={error} formatBytes={formatBytes} formatPercent={formatPercent} onOpenDetail={(kvm) => navigate(`/kvms/${kvm.node_id}/${kvm.vmid}`)} /></Suspense>}
                />
                <Route
                  path="/kvms/:nodeId/:vmid"
                  element={<Suspense fallback={<RouteFallback />}><KvmDetailRoute kvms={kvms} loadKvmWorkspaceByIds={loadKvmWorkspaceByIds} selectedKvm={selectedKvm} detailLoading={detailLoading} detailError={detailError} detail={detail} metrics={metrics} monitoring={monitoring} timeframe={timeframe} vncBootstrap={vncBootstrap} actionLoading={actionLoading} onBack={() => navigate('/kvms')} onRefresh={(next) => { if (selectedKvm) void loadKvmWorkspaceByIds(selectedKvm.node_id, selectedKvm.vmid, next ?? timeframe) }} onAction={(action) => void handleKvmAction(action)} formatPercent={formatPercent} formatBytes={formatBytes} formatSeconds={formatSeconds} metricSummary={metricSummary} /></Suspense>}
                />
                <Route
                  path="/password"
                  element={<Suspense fallback={<RouteFallback />}><PasswordPage passwordForm={passwordForm} submitting={submitting} onPasswordFormChange={setPasswordForm} onSubmit={handleChangePassword} onBack={() => navigate('/kvms')} /></Suspense>}
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute user={user!}>
                      <Suspense fallback={<RouteFallback />}>
                        <AdminPage
                          submitting={submitting}
                          adminUsers={adminUsers}
                          nodes={nodes}
                          permissions={permissions}
                          selectedAdminUserId={selectedAdminUserId}
                          validationResult={validationResult}
                          selectedNodeInventory={selectedNodeInventory}
                          nodeForm={nodeForm}
                          permissionForm={permissionForm}
                          onNodeFormChange={setNodeForm}
                          onPermissionFormChange={setPermissionForm}
                          onValidateNode={handleValidateNode}
                          onCreateNode={handleCreateNode}
                          onLoadNodeInventory={handleLoadNodeInventory}
                          onSelectAdminUser={handleSelectAdminUser}
                          onAssignPermission={handleAssignPermission}
                        />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute user={user!}>
                      <Suspense fallback={<RouteFallback />}>
                        <AdminUsersPage
                          users={adminUsers}
                          submitting={submitting}
                          currentAdminId={user!.id}
                          onCreateUser={handleCreateAdminUser}
                          onToggleUserStatus={handleToggleAdminUserStatus}
                        />
                      </Suspense>
                    </AdminRoute>
                  }
                />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>
}
