import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.core.crypto import encrypt_token
from app.core.errors import NotFoundError
from app.models.pve_node import PVENode
from app.services.node_service import get_node_inventory


@pytest.mark.asyncio
async def test_get_node_inventory_returns_mapped_kvms(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        assert node_name == "node1"
        return [
            {"vmid": 101, "name": "vm-101", "status": "running", "cpu": 0.5, "maxmem": 1024, "maxdisk": 2048},
            {"vmid": None, "name": "ignored"},
            {"vmid": 102, "name": "vm-102", "status": "stopped", "cpu": 0.1, "maxmem": 512, "maxdisk": 1024},
        ]

    monkeypatch.setattr("app.services.node_service.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    with Session(engine) as session:
        node = PVENode(
            name="node1",
            api_base_url="https://pve.example:8006",
            token_id="id",
            token_secret_encrypted=encrypt_token("secret"),
            selected_version="8.2.2",
            detected_version="8.2.2",
        )
        session.add(node)
        session.commit()
        session.refresh(node)

        result = await get_node_inventory(session, node.id or 0)

    assert result.node_id == node.id
    assert result.node_name == "node1"
    assert [item.vmid for item in result.kvms] == [101, 102]
    assert result.kvms[0].name == "vm-101"
    assert result.kvms[1].status == "stopped"


@pytest.mark.asyncio
async def test_get_node_inventory_raises_for_missing_node() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        with pytest.raises(NotFoundError, match="节点不存在"):
            await get_node_inventory(session, 999)
