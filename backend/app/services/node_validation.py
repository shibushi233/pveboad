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
        discovered_kvms = [
            NodeKVMInventoryItem(
                vmid=int(item.get("vmid", 0)),
                name=item.get("name"),
                status=item.get("status"),
                cpu=item.get("cpu"),
                maxmem=item.get("maxmem"),
                maxdisk=item.get("maxdisk"),
            )
            for item in await client.list_kvms_on_node(payload.name)
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
