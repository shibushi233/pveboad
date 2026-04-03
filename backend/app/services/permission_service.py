from sqlmodel import Session, select

from app.core.crypto import decrypt_token
from app.core.errors import ConflictError, NotFoundError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.pve.client import PVEClient
from app.schemas.permission import PermissionAssignRequest, PermissionItem
from app.services.node_service import resolve_pve_node_name


async def assign_permission(session: Session, payload: PermissionAssignRequest) -> PermissionItem:
    user = session.get(User, payload.user_id)
    if not user:
        raise NotFoundError("用户不存在")

    node = session.get(PVENode, payload.pve_node_id)
    if not node:
        raise NotFoundError("节点不存在")

    existing = session.exec(
        select(UserVMPermission).where(
            UserVMPermission.user_id == payload.user_id,
            UserVMPermission.pve_node_id == payload.pve_node_id,
            UserVMPermission.vmid == payload.vmid,
            UserVMPermission.vm_type == payload.vm_type,
        )
    ).first()
    if existing:
        raise ConflictError("该权限已存在")

    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    kvms = await client.list_kvms_on_node(pve_name)
    if payload.vmid not in {int(item["vmid"]) for item in kvms if item.get("vmid") is not None}:
        raise NotFoundError("该 VMID 不存在于当前节点")

    permission = UserVMPermission(
        user_id=payload.user_id,
        pve_node_id=payload.pve_node_id,
        vmid=payload.vmid,
        vm_type=payload.vm_type,
    )
    session.add(permission)
    session.commit()
    session.refresh(permission)
    return PermissionItem(
        id=permission.id or 0,
        user_id=permission.user_id,
        pve_node_id=permission.pve_node_id,
        vmid=permission.vmid,
        vm_type=permission.vm_type,
    )


def list_permissions_for_user(session: Session, user_id: int) -> list[PermissionItem]:
    permissions = session.exec(
        select(UserVMPermission)
        .where(UserVMPermission.user_id == user_id)
        .order_by(UserVMPermission.id.desc())
    ).all()
    return [
        PermissionItem(
            id=permission.id or 0,
            user_id=permission.user_id,
            pve_node_id=permission.pve_node_id,
            vmid=permission.vmid,
            vm_type=permission.vm_type,
        )
        for permission in permissions
    ]
