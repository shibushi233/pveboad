from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.auth.dependencies import get_current_user, require_admin
from app.core.crypto import encrypt_token
from app.db.session import get_session
from app.main import create_app
from app.models.pve_node import PVENode
from app.models.user import User
from app.schemas.permission import PermissionAssignRequest


def test_get_node_inventory_route_returns_400_for_missing_node(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = create_app()

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[require_admin] = lambda: User(id=1, username="admin", password_hash="hashed", role="admin", is_active=True, must_change_password=False)

    client = TestClient(app)
    response = client.get("/api/admin/nodes/999/inventory")

    assert response.status_code == 404
    assert response.json()["detail"] == "节点不存在"


def test_add_permission_route_returns_400_for_invalid_vmid(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = create_app()

    with Session(engine) as session:
        user = User(username="user1", password_hash="hashed", role="user", is_active=True, must_change_password=False)
        node = PVENode(
            name="node1",
            pve_node_name="node1",
            api_base_url="https://pve.example:8006",
            token_id="id",
            token_secret_encrypted=encrypt_token("secret"),
            selected_version="8.2.2",
            detected_version="8.2.2",
        )
        session.add(user)
        session.add(node)
        session.commit()
        session.refresh(user)
        session.refresh(node)
        user_id = user.id or 0
        node_id = node.id or 0

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        return [{"vmid": 101}]

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[require_admin] = lambda: User(id=1, username="admin", password_hash="hashed", role="admin", is_active=True, must_change_password=False)
    monkeypatch.setattr("app.services.permission_service.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    client = TestClient(app)
    response = client.post(
        "/api/admin/permissions",
        json=PermissionAssignRequest(user_id=user_id, pve_node_id=node_id, vmid=999, vm_type="qemu").model_dump(),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "该 VMID 不存在于当前节点"


def test_get_my_kvm_vnc_returns_bootstrap(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = create_app()

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: User(id=3, username="user1", password_hash="hashed", role="user", is_active=True, must_change_password=False)

    async def fake_get_vnc_bootstrap(session, user, node_id, vmid):
        return {
            "node_id": node_id,
            "node_name": "node-a",
            "vmid": vmid,
            "websocket_url": f"/api/user/kvms/{node_id}/{vmid}/vnc/ws",
            "password": None,
            "message": "VNC 控制台引导信息获取成功",
        }

    monkeypatch.setattr("app.api.routes.get_vnc_bootstrap", fake_get_vnc_bootstrap)

    client = TestClient(app)
    response = client.get("/api/user/kvms/7/101/vnc")

    assert response.status_code == 200
    assert response.json()["node_id"] == 7
    assert response.json()["vmid"] == 101
    assert response.json()["websocket_url"] == "/api/user/kvms/7/101/vnc/ws"
