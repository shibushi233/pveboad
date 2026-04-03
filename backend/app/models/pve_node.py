from __future__ import annotations

from datetime import datetime, UTC
from typing import Optional

from sqlmodel import Field, SQLModel


class PVENode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, max_length=128)
    pve_node_name: str = Field(default="", max_length=128)
    api_base_url: str
    token_id: str
    token_secret_encrypted: str
    selected_version: str = Field(max_length=16)
    detected_version: Optional[str] = Field(default=None, max_length=32)
    last_validated_at: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
