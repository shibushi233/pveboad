import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.crypto import encrypt_token
from app.core.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.services.kvm_service import get_kvm_detail, get_node_monitoring, run_kvm_action


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def setup(session):
    user = User(username="u1", password_hash="x", role="user", is_active=True, must_change_password=False)
    node = PVENode(
        name="node-a",
        pve_node_name="node-a",
        api_base_url="https://pve:8006",
        token_id="id",
        token_secret_encrypted=encrypt_token("secret"),
        selected_version="8.2.2",
        detected_version="8.2.2",
        is_active=True,
    )
    session.add(user)
    session.add(node)
    session.commit()
    session.refresh(user)
    session.refresh(node)
    return user, node


@pytest.mark.asyncio
async def test_get_kvm_detail_raises_permission_denied(session, setup) -> None:
    user, node = setup
    with pytest.raises(PermissionDeniedError, match="无权访问该 KVM"):
        await get_kvm_detail(session, user, node.id or 0, 101)


@pytest.mark.asyncio
async def test_get_kvm_detail_raises_not_found_for_disabled_node(session, setup) -> None:
    user, node = setup
    node.is_active = False
    session.add(node)
    session.commit()

    session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))
    session.commit()

    with pytest.raises(NotFoundError, match="节点不存在或已禁用"):
        await get_kvm_detail(session, user, node.id or 0, 101)


@pytest.mark.asyncio
async def test_run_kvm_action_raises_validation_error_for_invalid_action(session, setup) -> None:
    user, node = setup
    session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))
    session.commit()

    with pytest.raises(ValidationError, match="不支持的操作"):
        await run_kvm_action(session, user, node.id or 0, 101, "reboot")


@pytest.mark.asyncio
async def test_get_node_monitoring_raises_validation_error_for_bad_timeframe(session, setup) -> None:
    user, node = setup
    session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))
    session.commit()

    with pytest.raises(ValidationError, match="仅支持 day 或 week"):
        await get_node_monitoring(session, user, node.id or 0, "month")


@pytest.mark.asyncio
async def test_get_node_monitoring_raises_permission_denied(session, setup) -> None:
    user, node = setup
    with pytest.raises(PermissionDeniedError, match="无权访问该节点监控"):
        await get_node_monitoring(session, user, node.id or 0, "day")


@pytest.mark.asyncio
async def test_get_node_monitoring_raises_not_found_for_disabled_node(session, setup) -> None:
    user, node = setup
    node.is_active = False
    session.add(node)
    session.commit()

    session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type="qemu"))
    session.commit()

    with pytest.raises(NotFoundError, match="节点不存在或已禁用"):
        await get_node_monitoring(session, user, node.id or 0, "day")
