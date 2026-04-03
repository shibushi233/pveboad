from fastapi import APIRouter, Cookie, Depends, Response, WebSocket, status
from sqlmodel import Session

from app.db.session import engine

from app.auth.dependencies import get_current_user, require_admin
from app.auth.session import SESSION_COOKIE_NAME, SESSION_TTL_DAYS
from app.core.config import settings
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import (
    BootstrapAdminRequest,
    BootstrapAdminResponse,
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    UserSummary,
)
from app.schemas.health import HealthResponse
from app.schemas.kvm import (
    AuthorizedKVMItem,
    KVMActionResponse,
    KVMCurrentMetricsResponse,
    KVMDetailResponse,
    NodeMonitoringResponse,
)
from app.schemas.node import NodeCreateRequest, NodeCreateResponse, NodeInventoryResponse, NodeListItem, NodeValidationResult
from app.schemas.permission import PermissionAssignRequest, PermissionItem
from app.schemas.user_admin import AdminUserCreateRequest, AdminUserListItem, AdminUserUpdateStatusRequest
from app.schemas.vnc import VNCBootstrapResponse
from app.services.auth_service import bootstrap_admin, change_password, login_user, logout_session, user_to_summary
from app.services.kvm_service import (
    get_kvm_current_metrics,
    get_kvm_detail,
    get_node_monitoring,
    list_authorized_kvms,
    run_kvm_action,
)
from app.services.node_service import create_node, get_node_inventory, list_nodes
from app.services.node_validation import validate_node_for_create
from app.services.permission_service import assign_permission, list_permissions_for_user
from app.services.user_admin_service import create_user, list_users, set_user_status
from app.services.vnc_service import get_vnc_bootstrap, proxy_vnc_websocket


api_router = APIRouter()


@api_router.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", app_name=settings.app_name)


@api_router.get("/meta/pve-versions", response_model=list[str])
def get_supported_pve_versions() -> list[str]:
    return list(settings.allowed_pve_versions)


@api_router.post("/auth/bootstrap-admin", response_model=BootstrapAdminResponse, status_code=status.HTTP_201_CREATED)
def create_bootstrap_admin(payload: BootstrapAdminRequest, session: Session = Depends(get_session)) -> BootstrapAdminResponse:
    return bootstrap_admin(session, payload)


@api_router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, session: Session = Depends(get_session)) -> LoginResponse:
    user, auth_session = login_user(session, payload.username, payload.password)

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=auth_session.session_token,
        httponly=True,
        samesite="lax",
        secure=settings.force_https_cookies,
        max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
    )
    return LoginResponse(message="登录成功", user=user_to_summary(user))


@api_router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> Response:
    _ = current_user
    if session_token:
        logout_session(session, session_token)
    response.delete_cookie(SESSION_COOKIE_NAME)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@api_router.get("/auth/me", response_model=UserSummary)
def me(current_user: User = Depends(get_current_user)) -> UserSummary:
    return user_to_summary(current_user)


@api_router.post("/auth/change-password", response_model=UserSummary)
def update_password(
    payload: ChangePasswordRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserSummary:
    user = change_password(session, current_user, payload.current_password, payload.new_password)
    return user_to_summary(user)


@api_router.get("/admin/users", response_model=list[AdminUserListItem])
def get_users(_: User = Depends(require_admin), session: Session = Depends(get_session)) -> list[AdminUserListItem]:
    return list_users(session)


@api_router.post("/admin/users", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
def add_user(
    payload: AdminUserCreateRequest,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminUserListItem:
    return create_user(session, payload)


@api_router.patch("/admin/users/{user_id}/status", response_model=AdminUserListItem)
def patch_user_status(
    user_id: int,
    payload: AdminUserUpdateStatusRequest,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminUserListItem:
    return set_user_status(session, user_id, payload.is_active)


@api_router.get("/admin/nodes", response_model=list[NodeListItem])
def get_nodes(
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
) -> list[NodeListItem]:
    return list_nodes(session)


@api_router.post("/admin/nodes/validate", response_model=NodeValidationResult)
async def validate_node(
    payload: NodeCreateRequest,
    _: User = Depends(require_admin),
) -> NodeValidationResult:
    return await validate_node_for_create(payload)


@api_router.post("/admin/nodes", response_model=NodeCreateResponse, status_code=status.HTTP_201_CREATED)
async def add_node(
    payload: NodeCreateRequest,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
) -> NodeCreateResponse:
    return await create_node(session, payload)


@api_router.get("/admin/nodes/{node_id}/inventory", response_model=NodeInventoryResponse)
async def get_node_kvms(
    node_id: int,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> NodeInventoryResponse:
    return await get_node_inventory(session, node_id)


@api_router.get("/admin/users/{user_id}/permissions", response_model=list[PermissionItem])
def get_permissions_for_user(
    user_id: int,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> list[PermissionItem]:
    return list_permissions_for_user(session, user_id)


@api_router.post("/admin/permissions", response_model=PermissionItem, status_code=status.HTTP_201_CREATED)
async def add_permission(
    payload: PermissionAssignRequest,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> PermissionItem:
    return await assign_permission(session, payload)


@api_router.get("/user/kvms", response_model=list[AuthorizedKVMItem])
async def get_my_kvms(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[AuthorizedKVMItem]:
    return await list_authorized_kvms(session, current_user)


@api_router.get("/user/kvms/{node_id}/{vmid}", response_model=KVMDetailResponse)
async def get_my_kvm_detail(
    node_id: int,
    vmid: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> KVMDetailResponse:
    return await get_kvm_detail(session, current_user, node_id, vmid)


@api_router.post("/user/kvms/{node_id}/{vmid}/{action}", response_model=KVMActionResponse)
async def post_my_kvm_action(
    node_id: int,
    vmid: int,
    action: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> KVMActionResponse:
    return await run_kvm_action(session, current_user, node_id, vmid, action)


@api_router.get("/user/kvms/{node_id}/{vmid}/metrics/current", response_model=KVMCurrentMetricsResponse)
async def get_my_kvm_metrics(
    node_id: int,
    vmid: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> KVMCurrentMetricsResponse:
    return await get_kvm_current_metrics(session, current_user, node_id, vmid)


@api_router.get("/user/nodes/{node_id}/metrics/{timeframe}", response_model=NodeMonitoringResponse)
async def get_my_node_metrics(
    node_id: int,
    timeframe: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> NodeMonitoringResponse:
    return await get_node_monitoring(session, current_user, node_id, timeframe)


@api_router.get('/user/kvms/{node_id}/{vmid}/vnc', response_model=VNCBootstrapResponse)
async def get_my_kvm_vnc(
    node_id: int,
    vmid: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> VNCBootstrapResponse:
    return await get_vnc_bootstrap(session, current_user, node_id, vmid)


@api_router.websocket('/user/kvms/{node_id}/{vmid}/vnc/ws')
async def ws_my_kvm_vnc(websocket: WebSocket, node_id: int, vmid: int) -> None:
    with Session(engine) as session:
        await proxy_vnc_websocket(websocket, session, node_id, vmid)
