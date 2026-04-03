import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.errors import AuthenticationError, ConflictError, PermissionDeniedError
from app.models.user import User
from app.schemas.auth import BootstrapAdminRequest
from app.services.auth_service import bootstrap_admin, change_password, login_user, logout_session


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_bootstrap_admin_raises_conflict_when_admin_exists(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.hash_password", lambda p: f"hashed:{p}")
    session.add(User(username="existing", password_hash="h", role="admin", is_active=True, must_change_password=False))
    session.commit()

    with pytest.raises(ConflictError, match="管理员已存在"):
        bootstrap_admin(session, BootstrapAdminRequest(username="newadmin", password="password123"))


def test_bootstrap_admin_raises_conflict_on_duplicate_username(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.hash_password", lambda p: f"hashed:{p}")
    session.add(User(username="taken", password_hash="h", role="user", is_active=True, must_change_password=False))
    session.commit()

    with pytest.raises(ConflictError, match="用户名已存在"):
        bootstrap_admin(session, BootstrapAdminRequest(username="taken", password="password123"))


def test_login_user_raises_authentication_error_on_wrong_password(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.hash_password", lambda p: f"hashed:{p}")
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda plain, hashed: False)

    session.add(User(username="u1", password_hash="hashed:x", role="user", is_active=True, must_change_password=False))
    session.commit()

    with pytest.raises(AuthenticationError, match="用户名或密码错误"):
        login_user(session, "u1", "wrong")


def test_login_user_raises_permission_denied_when_disabled(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.hash_password", lambda p: f"hashed:{p}")
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda plain, hashed: True)

    session.add(User(username="u1", password_hash="hashed:x", role="user", is_active=False, must_change_password=False))
    session.commit()

    with pytest.raises(PermissionDeniedError, match="用户已被禁用"):
        login_user(session, "u1", "pass")


def test_change_password_raises_authentication_error_on_wrong_current(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda plain, hashed: False)

    user = User(username="u1", password_hash="old_hash", role="user", is_active=True, must_change_password=True)
    session.add(user)
    session.commit()
    session.refresh(user)

    with pytest.raises(AuthenticationError, match="当前密码错误"):
        change_password(session, user, "wrong_current", "new_pass")


def test_logout_session_deletes_existing_session(session) -> None:
    from app.models.session import UserSession
    from datetime import datetime, timedelta

    auth_session = UserSession(user_id=1, session_token="tok-1", expires_at=datetime.utcnow() + timedelta(days=1))
    session.add(auth_session)
    session.commit()

    logout_session(session, "tok-1")

    assert session.get(UserSession, auth_session.id) is None


def test_logout_session_is_noop_for_missing_token(session) -> None:
    logout_session(session, "nonexistent-token")
