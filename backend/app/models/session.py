from __future__ import annotations

from datetime import datetime, UTC
from typing import Optional

from sqlmodel import Field, SQLModel


class UserSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    session_token: str = Field(index=True, unique=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
