import httpx
import pytest

from app.schemas.node import NodeCreateRequest
from app.schemas.node import NodeValidationResult
from app.pve.client import PVEClient
from app.services.node_validation import validate_node_for_create


@pytest.mark.asyncio
async def test_probe_rejects_unsupported_selected_version() -> None:
    client = PVEClient("https://example.invalid:8006", "id", "secret")
    result = await client.probe_version("7.4")
    assert result.save_allowed is False
    assert result.detected_version is None


@pytest.mark.asyncio
async def test_validate_node_for_create_loads_discovered_kvms_when_save_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_probe_version(self, selected_version: str) -> NodeValidationResult:
        return NodeValidationResult(
            reachable=True,
            selected_version=selected_version,
            detected_version="8.2.2",
            save_allowed=True,
            message="ok",
            discovered_kvms=[],
        )

    async def fake_get_cluster_nodes(self) -> list[dict]:
        return [{"node": "pve-host", "status": "online"}]

    async def fake_list_kvms_on_node(self, node_name: str) -> list[dict]:
        assert node_name == "pve-host"
        return [
            {"vmid": 101, "name": "vm-101", "status": "running", "cpu": 0.5, "maxmem": 1024, "maxdisk": 2048},
            {"vmid": None, "name": "ignored"},
        ]

    monkeypatch.setattr("app.services.node_validation.PVEClient.probe_version", fake_probe_version)
    monkeypatch.setattr("app.services.node_validation.PVEClient.get_cluster_nodes", fake_get_cluster_nodes)
    monkeypatch.setattr("app.services.node_validation.PVEClient.list_kvms_on_node", fake_list_kvms_on_node)

    result = await validate_node_for_create(
        NodeCreateRequest(
            name="node1",
            api_base_url="https://pve.example:8006",
            token_id="id",
            token_secret="secret",
            selected_version="8.2.2",
        )
    )

    assert result.save_allowed is True
    assert result.detected_version == "8.2.2"
    assert [item.vmid for item in result.discovered_kvms] == [101]


@pytest.mark.asyncio
async def test_validate_node_for_create_skips_inventory_when_save_not_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_probe_version(self, selected_version: str) -> NodeValidationResult:
        return NodeValidationResult(
            reachable=True,
            selected_version=selected_version,
            detected_version="8.2.2",
            save_allowed=False,
            message="mismatch",
            discovered_kvms=[],
        )

    async def fail_list_kvms_on_node(self, node_name: str) -> list[dict]:
        raise AssertionError("inventory should not be loaded")

    monkeypatch.setattr("app.services.node_validation.PVEClient.probe_version", fake_probe_version)
    monkeypatch.setattr("app.services.node_validation.PVEClient.list_kvms_on_node", fail_list_kvms_on_node)

    result = await validate_node_for_create(
        NodeCreateRequest(
            name="node1",
            api_base_url="https://pve.example:8006",
            token_id="id",
            token_secret="secret",
            selected_version="8.2.2",
        )
    )

    assert result.save_allowed is False
    assert result.message == "mismatch"
    assert result.discovered_kvms == []


def test_pve_client_uses_tls_verify_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr('app.pve.client.settings.pve_tls_verify', True)
    monkeypatch.setattr('app.pve.client.settings.pve_tls_ca_path', None)

    assert PVEClient._tls_verify() is True


def test_pve_client_prefers_configured_ca_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr('app.pve.client.settings.pve_tls_ca_path', 'F:/certs/pve-ca.pem')

    verify = PVEClient._tls_verify()
    assert verify.endswith('pve-ca.pem')


@pytest.mark.asyncio
async def test_probe_reports_tls_error_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingAsyncClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            raise httpx.ConnectError('certificate verify failed')

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr('app.pve.client.httpx.AsyncClient', FailingAsyncClient)

    client = PVEClient('https://example.invalid:8006', 'id', 'secret')
    result = await client.probe_version('8.2.2')

    assert result.reachable is False
    assert result.save_allowed is False
    assert 'TLS 校验失败' in result.message or '无法连接到 PVE 节点' in result.message
