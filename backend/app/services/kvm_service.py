from sqlmodel import Session, select

from app.core.crypto import decrypt_token
from app.core.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.pve.client import PVEClient
from app.schemas.kvm import (
    AuthorizedKVMItem,
    KVMActionResponse,
    KVMCurrentMetricsResponse,
    KVMDetailResponse,
    KVMNetworkItem,
    NodeMetricsPoint,
    NodeMonitoringResponse,
)
from app.services.node_service import resolve_pve_node_name


def _extract_networks(config: dict) -> list[KVMNetworkItem]:
    items: list[KVMNetworkItem] = []
    for key, value in config.items():
        if not key.startswith("net") or not isinstance(value, str):
            continue

        parts = value.split(",")
        first = parts[0] if parts else ""
        model, _, macaddr = first.partition("=")
        bridge = None
        tag = None
        rate = None
        for part in parts[1:]:
            if part.startswith("bridge="):
                bridge = part.split("=", 1)[1]
            elif part.startswith("tag="):
                try:
                    tag = int(part.split("=", 1)[1])
                except ValueError:
                    tag = None
            elif part.startswith("rate="):
                try:
                    rate = int(float(part.split("=", 1)[1]))
                except ValueError:
                    rate = None

        items.append(
            KVMNetworkItem(
                key=key,
                model=model or None,
                bridge=bridge,
                macaddr=macaddr or None,
                tag=tag,
                rate=rate,
                raw=value,
            )
        )
    return items


def _get_authorized_permission(session: Session, user: User, vmid: int, node_id: int) -> tuple[UserVMPermission, PVENode]:
    permission = session.exec(
        select(UserVMPermission).where(
            UserVMPermission.user_id == (user.id or 0),
            UserVMPermission.pve_node_id == node_id,
            UserVMPermission.vmid == vmid,
            UserVMPermission.vm_type == "qemu",
        )
    ).first()
    if not permission:
        raise PermissionDeniedError("无权访问该 KVM")

    node = session.get(PVENode, node_id)
    if not node or not node.is_active:
        raise NotFoundError("节点不存在或已禁用")
    return permission, node


async def list_authorized_kvms(session: Session, user: User) -> list[AuthorizedKVMItem]:
    permissions = session.exec(
        select(UserVMPermission).where(UserVMPermission.user_id == (user.id or 0))
    ).all()

    items: list[AuthorizedKVMItem] = []
    for permission in permissions:
        node = session.get(PVENode, permission.pve_node_id)
        if not node or not node.is_active:
            continue

        client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
        pve_name = await resolve_pve_node_name(session, node)
        inventory = await client.list_kvms_on_node(pve_name)
        matched = next((vm for vm in inventory if vm.get("vmid") == permission.vmid), None)

        items.append(
            AuthorizedKVMItem(
                node_id=node.id or 0,
                node_name=node.name,
                vmid=permission.vmid,
                vm_type=permission.vm_type,
                name=matched.get("name") if matched else None,
                status=matched.get("status") if matched else None,
                cpu=matched.get("cpu") if matched else None,
                maxmem=matched.get("maxmem") if matched else None,
                maxdisk=matched.get("maxdisk") if matched else None,
            )
        )

    return items


async def get_kvm_detail(session: Session, user: User, node_id: int, vmid: int) -> KVMDetailResponse:
    permission, node = _get_authorized_permission(session, user, vmid, node_id)
    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    status = await client.get_kvm_status(pve_name, vmid)
    config = await client.get_kvm_config(pve_name, vmid)

    return KVMDetailResponse(
        node_id=node.id or 0,
        node_name=node.name,
        vmid=permission.vmid,
        vm_type=permission.vm_type,
        name=status.get("name") or config.get("name"),
        status=status.get("status"),
        cpu=status.get("cpu"),
        maxmem=status.get("maxmem"),
        maxdisk=status.get("maxdisk"),
        config=config,
        networks=_extract_networks(config),
    )


async def run_kvm_action(session: Session, user: User, node_id: int, vmid: int, action: str) -> KVMActionResponse:
    _, node = _get_authorized_permission(session, user, vmid, node_id)
    if action not in {"start", "shutdown", "stop"}:
        raise ValidationError("不支持的操作")

    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    task_id = await client.post_kvm_action(pve_name, vmid, action)
    return KVMActionResponse(
        node_id=node.id or 0,
        node_name=node.name,
        vmid=vmid,
        action=action,
        task_id=task_id,
        message="操作已提交",
    )


async def get_kvm_current_metrics(session: Session, user: User, node_id: int, vmid: int) -> KVMCurrentMetricsResponse:
    _, node = _get_authorized_permission(session, user, vmid, node_id)
    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    status = await client.get_kvm_status(pve_name, vmid)
    return KVMCurrentMetricsResponse(
        node_id=node.id or 0,
        node_name=node.name,
        vmid=vmid,
        status=status.get("status"),
        cpu=status.get("cpu"),
        mem=status.get("mem"),
        maxmem=status.get("maxmem"),
        disk=status.get("disk"),
        maxdisk=status.get("maxdisk"),
        uptime=status.get("uptime"),
    )


async def get_node_monitoring(session: Session, user: User, node_id: int, timeframe: str) -> NodeMonitoringResponse:
    if timeframe not in {"day", "week"}:
        raise ValidationError("仅支持 day 或 week")

    permission = session.exec(
        select(UserVMPermission).where(
            UserVMPermission.user_id == (user.id or 0),
            UserVMPermission.pve_node_id == node_id,
        )
    ).first()
    if not permission:
        raise PermissionDeniedError("无权访问该节点监控")

    node = session.get(PVENode, node_id)
    if not node or not node.is_active:
        raise NotFoundError("节点不存在或已禁用")

    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    rows = await client.get_node_rrddata(pve_name, timeframe)
    points = [
        NodeMetricsPoint(
            time=row.get("time"),
            cpu=row.get("cpu"),
            mem=row.get("mem"),
            disk=row.get("disk"),
            netin=row.get("netin"),
            netout=row.get("netout"),
        )
        for row in rows
    ]
    return NodeMonitoringResponse(
        node_id=node.id or 0,
        node_name=node.name,
        timeframe=timeframe,
        points=points,
    )
