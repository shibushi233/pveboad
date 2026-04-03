from datetime import datetime

from pydantic import BaseModel, Field


class NodeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    api_base_url: str
    token_id: str
    token_secret: str
    selected_version: str


class NodeKVMInventoryItem(BaseModel):
    vmid: int
    name: str | None = None
    status: str | None = None
    cpu: float | None = None
    maxmem: int | None = None
    maxdisk: int | None = None


class NodeValidationResult(BaseModel):
    reachable: bool
    selected_version: str
    detected_version: str | None = None
    save_allowed: bool
    message: str
    discovered_kvms: list[NodeKVMInventoryItem]


class NodeCreateResponse(BaseModel):
    id: int
    name: str
    api_base_url: str
    selected_version: str
    detected_version: str
    last_validated_at: datetime | None
    is_active: bool
    message: str
    discovered_kvms: list[NodeKVMInventoryItem]


class NodeListItem(BaseModel):
    id: int
    name: str
    api_base_url: str
    selected_version: str
    detected_version: str | None
    last_validated_at: datetime | None
    is_active: bool


class NodeInventoryResponse(BaseModel):
    node_id: int
    node_name: str
    kvms: list[NodeKVMInventoryItem]
