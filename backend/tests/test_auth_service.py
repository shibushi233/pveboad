from sqlmodel import Session, SQLModel, create_engine

from app.schemas.auth import BootstrapAdminRequest
from app.services.auth_service import bootstrap_admin


def test_bootstrap_admin_creates_admin(monkeypatch) -> None:
    monkeypatch.setattr("app.services.auth_service.hash_password", lambda password: f"hashed:{password}")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        result, auth_session = bootstrap_admin(
            session,
            BootstrapAdminRequest(username="admin", password="password123"),
        )

    assert result.username == "admin"
    assert auth_session.session_token is not None
