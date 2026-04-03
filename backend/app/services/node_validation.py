import httpx

from app.core.errors import UpstreamError
from app.pve.client import PVEClient
from app.schemas.node import NodeCreateRequest, NodeKVMInventoryItem, NodeValidationResult


async def validate_node_for_create(payload: NodeCreateRequest) -> NodeValidationResult:
    client = PVEClient(
        api_base_url=payload.api_base_url,
        token_id=payload.token_id,
        token_secret=payload.token_secret,
    )
    probe = await client.probe_version(payload.selected_version)
    discovered_kvms: list[NodeKVMInventoryItem] = []

    if probe.save_allowed:
        # 自动从 PVE 集群获取真实节点主机名，而非使用用户填写的友好名称
        try:
            nodes = await client.get_cluster_nodes()
        except httpx.HTTPStatusError as exc:
            raise UpstreamError(f"PVE API 返回错误（HTTP {exc.response.status_code}），请检查 Token 权限") from exc
        except Exception as exc:
            raise UpstreamError(f"获取 PVE 节点列表失败：{exc}") from exc

        if not nodes:
            raise UpstreamError("PVE 集群未返回任何节点")

        pve_node_name = nodes[0].get("node")
        if not pve_node_name:
            raise UpstreamError("无法获取 PVE 节点主机名")

        try:
            raw_kvms = await client.list_kvms_on_node(pve_node_name)
        except httpx.HTTPStatusError as exc:
            raise UpstreamError(f"获取节点 KVM 列表失败（HTTP {exc.response.status_code}）") from exc
        except Exception as exc:
            raise UpstreamError(f"获取节点 KVM 列表失败：{exc}") from exc

        discovered_kvms = [
            NodeKVMInventoryItem(
                vmid=int(item.get("vmid", 0)),
                name=item.get("name"),
                status=item.get("status"),
                cpu=item.get("cpu"),
                maxmem=item.get("maxmem"),
                maxdisk=item.get("maxdisk"),
            )
            for item in raw_kvms
            if item.get("vmid") is not None
        ]

    return NodeValidationResult(
        reachable=probe.reachable,
        selected_version=payload.selected_version,
        detected_version=probe.detected_version,
        save_allowed=probe.save_allowed,
        message=probe.message,
        discovered_kvms=discovered_kvms,
    )
