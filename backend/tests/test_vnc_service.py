import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.crypto import encrypt_token
from app.core.errors import PermissionDeniedError
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.user import User
from app.services.vnc_service import _get_authorized_node, get_vnc_bootstrap, proxy_vnc_websocket


class DummyWebSocket:
    def __init__(self, session_token: str | None = None) -> None:
        self.cookies = {}
        if session_token is not None:
            self.cookies['pve_panel_session'] = session_token
        self.accepted = False
        self.closed = []

    async def accept(self) -> None:
        self.accepted = True

    async def close(self, code: int = 1000, reason: str | None = None) -> None:
        self.closed.append((code, reason))


def test_get_authorized_node_returns_node_for_permitted_user() -> None:
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(username='u1', password_hash='x', role='user', is_active=True)
        node = PVENode(
            name='node-a',
            pve_node_name='node-a',
            api_base_url='https://pve.example:8006',
            token_id='id',
            token_secret_encrypted=encrypt_token('secret'),
            selected_version='8.2.2',
            detected_version='8.2.2',
            is_active=True,
        )
        session.add(user)
        session.add(node)
        session.commit()
        session.refresh(user)
        session.refresh(node)

        session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type='qemu'))
        session.commit()

        result = _get_authorized_node(session, user, node.id or 0, 101)
        assert result.id == node.id


@pytest.mark.asyncio
async def test_get_vnc_bootstrap_returns_expected_payload() -> None:
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(username='u1', password_hash='x', role='user', is_active=True)
        node = PVENode(
            name='node-a',
            pve_node_name='node-a',
            api_base_url='https://pve.example:8006',
            token_id='id',
            token_secret_encrypted=encrypt_token('secret'),
            selected_version='8.2.2',
            detected_version='8.2.2',
            is_active=True,
        )
        session.add(user)
        session.add(node)
        session.commit()
        session.refresh(user)
        session.refresh(node)
        session.add(UserVMPermission(user_id=user.id or 0, pve_node_id=node.id or 0, vmid=101, vm_type='qemu'))
        session.commit()

        result = await get_vnc_bootstrap(session, user, node.id or 0, 101)

        assert result.node_id == node.id
        assert result.node_name == 'node-a'
        assert result.vmid == 101
        assert result.websocket_url == f'/api/user/kvms/{node.id or 0}/101/vnc/ws'


@pytest.mark.asyncio
async def test_proxy_vnc_websocket_closes_when_session_cookie_missing() -> None:
    websocket = DummyWebSocket()
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        await proxy_vnc_websocket(websocket, session, 1, 101)

    assert websocket.accepted is False
    assert websocket.closed == [(4401, '未登录')]


@pytest.mark.asyncio
async def test_proxy_vnc_websocket_closes_when_user_is_disabled(monkeypatch) -> None:
    websocket = DummyWebSocket('token-1')
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
    SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(
        'app.services.vnc_service.get_user_by_session_token',
        lambda session, token: User(id=1, username='u1', password_hash='x', role='user', is_active=False),
    )

    with Session(engine) as session:
        await proxy_vnc_websocket(websocket, session, 1, 101)

    assert websocket.accepted is False
    assert websocket.closed == [(4403, '用户已被禁用')]


@pytest.mark.asyncio
async def test_proxy_vnc_websocket_closes_when_permission_check_fails(monkeypatch) -> None:
    websocket = DummyWebSocket('token-1')
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False})
    SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(
        'app.services.vnc_service.get_user_by_session_token',
        lambda session, token: User(id=1, username='u1', password_hash='x', role='user', is_active=True),
    )
    monkeypatch.setattr(
        'app.services.vnc_service._get_authorized_node',
        lambda session, user, node_id, vmid: (_ for _ in ()).throw(PermissionDeniedError('无权访问该 KVM 控制台')),
    )

    with Session(engine) as session:
        await proxy_vnc_websocket(websocket, session, 1, 101)

    assert websocket.accepted is False
    assert websocket.closed == [(4403, '无权访问该 KVM 控制台')]
