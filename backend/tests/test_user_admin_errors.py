import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.errors import ConflictError, NotFoundError
from app.models.user import User
from app.schemas.user_admin import AdminUserCreateRequest
from app.services.user_admin_service import create_user, set_user_status


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_create_user_raises_conflict_on_duplicate(session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.user_admin_service.hash_password", lambda p: f"hashed:{p}")
    session.add(User(username="dup", password_hash="h", role="user", is_active=True, must_change_password=False))
    session.commit()

    with pytest.raises(ConflictError, match="用户名已存在"):
        create_user(session, AdminUserCreateRequest(username="dup", password="password123", role="user"))


def test_set_user_status_raises_not_found(session) -> None:
    with pytest.raises(NotFoundError, match="用户不存在"):
        set_user_status(session, 999, is_active=False)
