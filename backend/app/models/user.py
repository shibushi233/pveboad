from __future__ import annotations

from datetime import datetime, UTC
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=64)
    password_hash: str
    role: str = Field(default="user", max_length=16)
    is_active: bool = Field(default=True)
    must_change_password: bool = Field(default=True)
    password_changed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
