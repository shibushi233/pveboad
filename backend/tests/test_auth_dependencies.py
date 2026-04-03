import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine

from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_get_current_user_raises_401_when_no_cookie(session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session=session, session_token=None)
    assert exc_info.value.status_code == 401
    assert "未登录" in exc_info.value.detail


def test_get_current_user_raises_401_when_session_invalid(session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session=session, session_token="bad-token")
    assert exc_info.value.status_code == 401
    assert "登录已失效" in exc_info.value.detail


def test_get_current_user_raises_403_when_user_disabled(session, monkeypatch) -> None:
    disabled_user = User(id=1, username="u1", password_hash="x", role="user", is_active=False, must_change_password=False)

    monkeypatch.setattr(
        "app.auth.dependencies.get_user_by_session_token",
        lambda session, token: disabled_user,
    )

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(session=session, session_token="valid-token")
    assert exc_info.value.status_code == 403
    assert "禁用" in exc_info.value.detail


def test_get_current_user_returns_active_user(session, monkeypatch) -> None:
    active_user = User(id=2, username="u2", password_hash="x", role="user", is_active=True, must_change_password=False)

    monkeypatch.setattr(
        "app.auth.dependencies.get_user_by_session_token",
        lambda session, token: active_user,
    )

    result = get_current_user(session=session, session_token="valid-token")
    assert result.id == 2
    assert result.is_active is True


def test_require_admin_raises_403_for_non_admin() -> None:
    user = User(id=1, username="u1", password_hash="x", role="user", is_active=True, must_change_password=False)

    with pytest.raises(HTTPException) as exc_info:
        require_admin(user=user)
    assert exc_info.value.status_code == 403
    assert "管理员" in exc_info.value.detail


def test_require_admin_returns_admin_user() -> None:
    user = User(id=1, username="admin", password_hash="x", role="admin", is_active=True, must_change_password=False)
    result = require_admin(user=user)
    assert result.role == "admin"
