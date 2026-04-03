from datetime import datetime, UTC

from sqlmodel import Session, select

from app.models.pve_node import PVENode
from app.core.crypto import decrypt_token, encrypt_token
from app.core.errors import ConflictError, NotFoundError, UpstreamError
from app.pve.client import PVEClient
from app.schemas.node import NodeCreateRequest, NodeCreateResponse, NodeInventoryResponse, NodeKVMInventoryItem, NodeListItem
from app.services.node_validation import validate_node_for_create


async def resolve_pve_node_name(session: Session, node: PVENode) -> str:
    """Return the real PVE hostname, auto-discovering and caching if missing."""
    if node.pve_node_name:
        return node.pve_node_name
    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    nodes = await client.get_cluster_nodes()
    if not nodes:
        raise UpstreamError("PVE 集群未返回任何节点")
    real_name = nodes[0].get("node")
    if not real_name:
        raise UpstreamError("无法获取 PVE 节点主机名")
    node.pve_node_name = real_name
    session.add(node)
    session.commit()
    return real_name


async def create_node(session: Session, payload: NodeCreateRequest) -> NodeCreateResponse:
    validation = await validate_node_for_create(payload)
    if not validation.save_allowed or not validation.detected_version:
        raise UpstreamError(validation.message)

    existing = session.exec(select(PVENode).where(PVENode.name == payload.name)).first()
    if existing:
        raise ConflictError("节点名称已存在")

    display_name = payload.name or validation.pve_node_name or "unknown"
    pve_node_name = validation.pve_node_name or payload.name
    node = PVENode(
        name=display_name,
        pve_node_name=pve_node_name,
        api_base_url=payload.api_base_url.rstrip("/"),
        token_id=payload.token_id,
        token_secret_encrypted=encrypt_token(payload.token_secret),
        selected_version=payload.selected_version,
        detected_version=validation.detected_version,
        last_validated_at=datetime.now(UTC),
        is_active=True,
    )
    session.add(node)
    session.commit()
    session.refresh(node)

    return NodeCreateResponse(
        id=node.id,
        name=node.name,
        api_base_url=node.api_base_url,
        selected_version=node.selected_version,
        detected_version=node.detected_version or "",
        last_validated_at=node.last_validated_at,
        is_active=node.is_active,
        message="节点创建成功",
        discovered_kvms=validation.discovered_kvms,
    )


def list_nodes(session: Session) -> list[NodeListItem]:
    nodes = session.exec(select(PVENode).order_by(PVENode.id.desc())).all()
    return [
        NodeListItem(
            id=node.id or 0,
            name=node.name,
            api_base_url=node.api_base_url,
            selected_version=node.selected_version,
            detected_version=node.detected_version,
            last_validated_at=node.last_validated_at,
            is_active=node.is_active,
        )
        for node in nodes
    ]


async def get_node_inventory(session: Session, node_id: int) -> NodeInventoryResponse:
    node = session.get(PVENode, node_id)
    if not node:
        raise NotFoundError("节点不存在")

    client = PVEClient(node.api_base_url, node.token_id, decrypt_token(node.token_secret_encrypted))
    pve_name = await resolve_pve_node_name(session, node)
    kvms = await client.list_kvms_on_node(pve_name)
    return NodeInventoryResponse(
        node_id=node.id or 0,
        node_name=node.name,
        kvms=[
            NodeKVMInventoryItem(
                vmid=int(item.get("vmid", 0)),
                name=item.get("name"),
                status=item.get("status"),
                cpu=item.get("cpu"),
                maxmem=item.get("maxmem"),
                maxdisk=item.get("maxdisk"),
            )
            for item in kvms
            if item.get("vmid") is not None
        ],
    )
