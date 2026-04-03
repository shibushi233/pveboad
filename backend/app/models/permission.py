from typing import Optional

from sqlmodel import Field, SQLModel


class UserVMPermission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    pve_node_id: int = Field(index=True)
    vmid: int = Field(index=True)
    vm_type: str = Field(default="qemu", max_length=16)
