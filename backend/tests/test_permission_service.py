import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.crypto import encrypt_token
from app.core.errors import ConflictError, NotFoundError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.schemas.permission import PermissionAssignRequest
from app.services.permission_service import assign_permission, list_permissions_for_user


@pytest.mark.asyncio
async def test_assign_permission(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        assert node_name == "node1"
        return [{"vmid": 101}, {"vmid": None}]

    monkeypatch.setattr("app.services.permission_service.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    with Session(engine) as session:
        user = User(username="user1", password_hash="hashed")
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

        permission = await assign_permission(
            session,
            PermissionAssignRequest(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"),
        )
        permissions = list_permissions_for_user(session, user.id or 0)

    assert permission.vmid == 101
    assert len(permissions) == 1
    assert permissions[0].vmid == 101


@pytest.mark.asyncio
async def test_assign_permission_raises_for_missing_user() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        node = PVENode(
            name="node1",
            pve_node_name="node1",
            api_base_url="https://pve.example:8006",
            token_id="id",
            token_secret_encrypted=encrypt_token("secret"),
            selected_version="8.2.2",
            detected_version="8.2.2",
        )
        session.add(node)
        session.commit()
        session.refresh(node)

        with pytest.raises(NotFoundError, match="用户不存在"):
            await assign_permission(session, PermissionAssignRequest(user_id=1, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))


@pytest.mark.asyncio
async def test_assign_permission_raises_for_missing_node() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(username="user1", password_hash="hashed")
        session.add(user)
        session.commit()
        session.refresh(user)

        with pytest.raises(NotFoundError, match="节点不存在"):
            await assign_permission(session, PermissionAssignRequest(user_id=user.id or 0, pve_node_id=1, vmid=101, vm_type="qemu"))


@pytest.mark.asyncio
async def test_assign_permission_raises_for_duplicate_permission(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        return [{"vmid": 101}]

    monkeypatch.setattr("app.services.permission_service.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    with Session(engine) as session:
        user = User(username="user1", password_hash="hashed")
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
        session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))
        session.commit()

        with pytest.raises(ConflictError, match="该权限已存在"):
            await assign_permission(session, PermissionAssignRequest(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))


@pytest.mark.asyncio
async def test_assign_permission_raises_for_unknown_vmid(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        return [{"vmid": 101}, {"vmid": None}]

    monkeypatch.setattr("app.services.permission_service.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    with Session(engine) as session:
        user = User(username="user1", password_hash="hashed")
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

        with pytest.raises(NotFoundError, match="该 VMID 不存在于当前节点"):
            await assign_permission(session, PermissionAssignRequest(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=999, vm_type="qemu"))
