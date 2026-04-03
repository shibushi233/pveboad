from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.auth.dependencies import require_admin
from app.core.errors import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    UpstreamError,
    ValidationError,
)
from app.db.session import get_session
from app.main import create_app
from app.models.user import User


def _make_app(engine):
    app = create_app()

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[require_admin] = lambda: User(
        id=1, username="admin", password_hash="x", role="admin", is_active=True, must_change_password=False
    )
    return app


def test_not_found_error_returns_404(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_not_found(*args, **kwargs):
        raise NotFoundError("测试资源不存在")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_not_found)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "测试资源不存在"


def test_conflict_error_returns_409(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_conflict(*args, **kwargs):
        raise ConflictError("资源已存在")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_conflict)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 409
    assert resp.json()["detail"] == "资源已存在"


def test_authentication_error_returns_401(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_auth(*args, **kwargs):
        raise AuthenticationError("认证失败")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_auth)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "认证失败"


def test_permission_denied_error_returns_403(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_perm(*args, **kwargs):
        raise PermissionDeniedError("无权操作")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_perm)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 403
    assert resp.json()["detail"] == "无权操作"


def test_validation_error_returns_422(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_validation(*args, **kwargs):
        raise ValidationError("参数不合法")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_validation)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "参数不合法"


def test_upstream_error_returns_502(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = _make_app(engine)

    def raise_upstream(*args, **kwargs):
        raise UpstreamError("上游不可达")

    monkeypatch.setattr("app.api.routes.list_nodes", raise_upstream)

    client = TestClient(app)
    resp = client.get("/api/admin/nodes")
    assert resp.status_code == 502
    assert resp.json()["detail"] == "上游不可达"
