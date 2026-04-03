from pydantic import BaseModel, Field


class PermissionAssignRequest(BaseModel):
    user_id: int = Field(gt=0)
    pve_node_id: int = Field(gt=0)
    vmid: int = Field(gt=0)
    vm_type: str = Field(default="qemu", pattern="^(qemu)$")


class PermissionItem(BaseModel):
    id: int
    user_id: int
    pve_node_id: int
    vmid: int
    vm_type: str
