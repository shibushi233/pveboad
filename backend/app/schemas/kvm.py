from pydantic import BaseModel


class AuthorizedKVMItem(BaseModel):
    node_id: int
    node_name: str
    vmid: int
    vm_type: str
    name: str | None
    status: str | None
    cpu: float | None
    maxmem: int | None
    maxdisk: int | None


class KVMNetworkItem(BaseModel):
    key: str
    model: str | None
    bridge: str | None
    macaddr: str | None
    tag: int | None
    rate: int | None
    raw: str


class KVMDetailResponse(BaseModel):
    node_id: int
    node_name: str
    vmid: int
    vm_type: str
    name: str | None
    status: str | None
    cpu: float | None
    maxmem: int | None
    maxdisk: int | None
    config: dict
    networks: list[KVMNetworkItem]


class KVMActionResponse(BaseModel):
    node_id: int
    node_name: str
    vmid: int
    action: str
    task_id: str | None
    message: str


class KVMCurrentMetricsResponse(BaseModel):
    node_id: int
    node_name: str
    vmid: int
    status: str | None
    cpu: float | None
    mem: int | None
    maxmem: int | None
    disk: int | None
    maxdisk: int | None
    uptime: int | None


class NodeMetricsPoint(BaseModel):
    time: int | None
    cpu: float | None = None
    mem: float | None = None
    disk: float | None = None
    netin: float | None = None
    netout: float | None = None


class NodeMonitoringResponse(BaseModel):
    node_id: int
    node_name: str
    timeframe: str
    points: list[NodeMetricsPoint]
