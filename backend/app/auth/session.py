from __future__ import annotations

from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe

from app.models.session import UserSession


SESSION_COOKIE_NAME = "pve_panel_session"
SESSION_TTL_DAYS = 7


def create_session_token() -> str:
    return token_urlsafe(32)


def build_session(user_id: int) -> UserSession:
    now = datetime.now(UTC)
    return UserSession(
        user_id=user_id,
        session_token=create_session_token(),
        expires_at=now + timedelta(days=SESSION_TTL_DAYS),
    )
