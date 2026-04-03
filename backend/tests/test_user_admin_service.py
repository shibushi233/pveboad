from sqlmodel import Session, SQLModel, create_engine

from app.schemas.user_admin import AdminUserCreateRequest
from app.services.user_admin_service import create_user, list_users


def test_create_user_and_list_users(monkeypatch) -> None:
    monkeypatch.setattr("app.services.user_admin_service.hash_password", lambda password: f"hashed:{password}")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        create_user(
            session,
            AdminUserCreateRequest(username="user1", password="password123", role="user"),
        )
        users = list_users(session)

    assert len(users) == 1
    assert users[0].username == "user1"
