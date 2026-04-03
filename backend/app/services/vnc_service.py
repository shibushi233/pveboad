from urllib.parse import urlparse

from fastapi import WebSocket
from sqlmodel import Session, select
from websockets.asyncio.client import connect as websocket_connect
from websockets.exceptions import ConnectionClosed

from app.auth.session import SESSION_COOKIE_NAME
from app.core.crypto import decrypt_token
from app.core.errors import AppError, NotFoundError, PermissionDeniedError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.pve.client import PVEClient
from app.schemas.vnc import VNCBootstrapResponse
from app.services.auth_service import get_user_by_session_token
from app.services.node_service import resolve_pve_node_name


async def get_vnc_bootstrap(session: Session, user: User, node_id: int, vmid: int) -> VNCBootstrapResponse:
    node = _get_authorized_node(session, user, node_id, vmid)
    return VNCBootstrapResponse(
        node_id=node.id or 0,
        node_name=node.name,
        vmid=vmid,
        websocket_url=f"/api/user/kvms/{node_id}/{vmid}/vnc/ws",
        password=None,
        message="VNC 控制台引导信息获取成功",
    )


async def proxy_vnc_websocket(websocket: WebSocket, session: Session, node_id: int, vmid: int) -> None:
    session_token = websocket.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        await websocket.close(code=4401, reason="未登录")
        return

    user = get_user_by_session_token(session, session_token)
    if not user:
        await websocket.close(code=4401, reason="登录已失效")
        return
    if not user.is_active:
        await websocket.close(code=4403, reason="用户已被禁用")
        return

    try:
        node = _get_authorized_node(session, user, node_id, vmid)
    except AppError as exc:
        await websocket.close(code=4403, reason=exc.detail)
        return

    await websocket.accept()

    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    proxy_data = await client.get_kvm_vnc_proxy(pve_name, vmid)
    parsed = urlparse(node.api_base_url)
    port = proxy_data.get("port")
    ticket = proxy_data.get("ticket")
    if not port or not ticket or not parsed.hostname:
        await websocket.close(code=1011, reason="无法建立 VNC 代理连接")
        return

    ws_scheme = "wss" if parsed.scheme == "https" else "ws"
    upstream_url = (
        f"{ws_scheme}://{parsed.hostname}:{parsed.port or 8006}"
        f"/api2/json/nodes/{pve_name}/qemu/{vmid}/vncwebsocket?port={port}&vncticket={ticket}"
    )

    try:
        async with websocket_connect(
            upstream_url,
            additional_headers=client._auth_headers(),
            ssl=None if ws_scheme == "ws" else True,
            max_size=None,
        ) as upstream:
            async def browser_to_upstream() -> None:
                while True:
                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        break
                    if "text" in message and message["text"] is not None:
                        await upstream.send(message["text"])
                    elif "bytes" in message and message["bytes"] is not None:
                        await upstream.send(message["bytes"])

            async def upstream_to_browser() -> None:
                while True:
                    payload = await upstream.recv()
                    if isinstance(payload, bytes):
                        await websocket.send_bytes(payload)
                    else:
                        await websocket.send_text(payload)

            import asyncio
            await asyncio.gather(browser_to_upstream(), upstream_to_browser())
    except ConnectionClosed:
        await websocket.close()
    except Exception:
        await websocket.close(code=1011, reason="VNC 代理连接失败")


def _get_authorized_node(session: Session, user: User, node_id: int, vmid: int) -> PVENode:
    permission = session.exec(
        select(UserVMPermission).where(
            UserVMPermission.user_id == (user.id or 0),
            UserVMPermission.pve_node_id == node_id,
            UserVMPermission.vmid == vmid,
            UserVMPermission.vm_type == "qemu",
        )
    ).first()
    if not permission:
        raise PermissionDeniedError("无权访问该 KVM 控制台")

    node = session.get(PVENode, node_id)
    if not node or not node.is_active:
        raise NotFoundError("节点不存在或已禁用")
    return node
