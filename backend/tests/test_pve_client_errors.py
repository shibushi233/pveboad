import httpx
import pytest

from app.pve.client import PVEClient


class _FakeResponse:
    def __init__(self, status_code: int = 200, json_data: dict | None = None):
        self.status_code = status_code
        self._json = json_data

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"HTTP {self.status_code}",
                request=httpx.Request("GET", "https://example.com"),
                response=httpx.Response(self.status_code),
            )


class _FailingContextManager:
    """Async context manager whose __aenter__ raises."""

    def __init__(self, exc):
        self._exc = exc

    async def __aenter__(self):
        raise self._exc

    async def __aexit__(self, *args):
        return False


@pytest.mark.asyncio
async def test_probe_reports_non_200_status(monkeypatch) -> None:
    class _FakeAsyncClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            return _FakeResponse(status_code=403, json_data={})

    monkeypatch.setattr("app.pve.client.httpx.AsyncClient", _FakeAsyncClient)

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is False
    assert result.save_allowed is False
    assert "403" in result.message


@pytest.mark.asyncio
async def test_probe_reports_invalid_json(monkeypatch) -> None:
    class _BadJsonResponse:
        status_code = 200

        def json(self):
            raise ValueError("bad json")

    class _FakeAsyncClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            return _BadJsonResponse()

    monkeypatch.setattr("app.pve.client.httpx.AsyncClient", _FakeAsyncClient)

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is False
    assert result.save_allowed is False
    assert "无效 JSON" in result.message


@pytest.mark.asyncio
async def test_probe_reports_missing_version_in_response(monkeypatch) -> None:
    class _FakeAsyncClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            return _FakeResponse(status_code=200, json_data={"data": {}})

    monkeypatch.setattr("app.pve.client.httpx.AsyncClient", _FakeAsyncClient)

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is True
    assert result.save_allowed is False
    assert "版本信息" in result.message


@pytest.mark.asyncio
async def test_probe_reports_version_mismatch(monkeypatch) -> None:
    class _FakeAsyncClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            return _FakeResponse(status_code=200, json_data={"data": {"release": "9.1.1"}})

    monkeypatch.setattr("app.pve.client.httpx.AsyncClient", _FakeAsyncClient)

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is True
    assert result.detected_version == "9.1.1"
    assert result.save_allowed is False
    assert "不一致" in result.message


@pytest.mark.asyncio
async def test_probe_succeeds_with_matching_version(monkeypatch) -> None:
    class _FakeAsyncClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            return _FakeResponse(status_code=200, json_data={"data": {"release": "8.2.2"}})

    monkeypatch.setattr("app.pve.client.httpx.AsyncClient", _FakeAsyncClient)

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is True
    assert result.save_allowed is True
    assert result.detected_version == "8.2.2"


@pytest.mark.asyncio
async def test_probe_handles_transport_error(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.pve.client.httpx.AsyncClient",
        lambda **kw: _FailingContextManager(httpx.TransportError("tls cert error")),
    )

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is False
    assert "TLS 校验失败" in result.message or "传输异常" in result.message


@pytest.mark.asyncio
async def test_probe_handles_generic_http_error(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.pve.client.httpx.AsyncClient",
        lambda **kw: _FailingContextManager(httpx.HTTPError("read timeout")),
    )

    client = PVEClient("https://pve:8006", "id", "secret")
    result = await client.probe_version("8.2.2")

    assert result.reachable is False
    assert result.save_allowed is False
