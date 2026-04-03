from dataclasses import dataclass
from pathlib import Path

import httpx

from app.core.config import settings


@dataclass
class VersionProbeResult:
    reachable: bool
    detected_version: str | None
    save_allowed: bool
    message: str


class PVEClient:
    def __init__(self, api_base_url: str, token_id: str, token_secret: str):
        self.api_base_url = api_base_url.rstrip("/")
        self.token_id = token_id
        self.token_secret = token_secret

    @staticmethod
    def _tls_verify() -> bool | str:
        ca_path = settings.pve_tls_ca_path
        if ca_path:
            return str(Path(ca_path))
        return settings.pve_tls_verify

    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"PVEAPIToken={self.token_id}={self.token_secret}",
        }

    async def _get_json(self, path: str) -> dict:
        url = f"{self.api_base_url}{path}"
        async with httpx.AsyncClient(timeout=10.0, verify=self._tls_verify()) as client:
            response = await client.get(url, headers=self._auth_headers())
            response.raise_for_status()
            return response.json()

    async def _post_json(self, path: str) -> dict:
        url = f"{self.api_base_url}{path}"
        async with httpx.AsyncClient(timeout=10.0, verify=self._tls_verify()) as client:
            response = await client.post(url, headers=self._auth_headers())
            response.raise_for_status()
            return response.json()

    @staticmethod
    def _normalize_version(version: str | None) -> str | None:
        if not version:
            return None
        version = version.strip()
        for supported in settings.allowed_pve_versions:
            if version.startswith(supported) or supported.startswith(version):
                return supported
        return version

    async def probe_version(self, selected_version: str) -> VersionProbeResult:
        if selected_version not in settings.allowed_pve_versions:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message=f"不支持的 PVE 版本：{selected_version}",
            )

        url = f"{self.api_base_url}/api2/json/version"
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=self._tls_verify()) as client:
                response = await client.get(url, headers=self._auth_headers())
        except httpx.ConnectError as exc:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message=f"无法连接到 PVE 节点：{exc}",
            )
        except httpx.TransportError as exc:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message=f"PVE TLS 校验失败或传输异常：{exc}",
            )
        except httpx.HTTPError as exc:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message=f"无法连接到 PVE 节点：{exc}",
            )

        if response.status_code != 200:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message=f"PVE 节点验证失败，状态码：{response.status_code}",
            )

        try:
            payload = response.json()
        except ValueError:
            return VersionProbeResult(
                reachable=False,
                detected_version=None,
                save_allowed=False,
                message="PVE 版本探测返回了无效 JSON",
            )

        data = payload.get("data") or {}
        detected_raw = data.get("release") or data.get("version")
        detected_version = self._normalize_version(detected_raw)
        if not detected_version:
            return VersionProbeResult(
                reachable=True,
                detected_version=None,
                save_allowed=False,
                message="无法从 PVE 节点读取版本信息",
            )

        if detected_version != selected_version:
            return VersionProbeResult(
                reachable=True,
                detected_version=detected_version,
                save_allowed=False,
                message=f"所选版本 {selected_version} 与实际探测版本 {detected_version} 不一致，禁止保存。",
            )

        return VersionProbeResult(
            reachable=True,
            detected_version=detected_version,
            save_allowed=True,
            message="节点校验通过",
        )

    async def get_cluster_nodes(self) -> list[dict]:
        payload = await self._get_json("/api2/json/nodes")
        data = payload.get("data")
        return data if isinstance(data, list) else []

    async def list_kvms_on_node(self, node_name: str) -> list[dict]:
        payload = await self._get_json(f"/api2/json/nodes/{node_name}/qemu")
        data = payload.get("data")
        return data if isinstance(data, list) else []

    async def get_kvm_status(self, node_name: str, vmid: int) -> dict:
        payload = await self._get_json(f"/api2/json/nodes/{node_name}/qemu/{vmid}/status/current")
        return payload.get("data") or {}

    async def get_kvm_config(self, node_name: str, vmid: int) -> dict:
        payload = await self._get_json(f"/api2/json/nodes/{node_name}/qemu/{vmid}/config")
        return payload.get("data") or {}

    async def post_kvm_action(self, node_name: str, vmid: int, action: str) -> str | None:
        payload = await self._post_json(f"/api2/json/nodes/{node_name}/qemu/{vmid}/status/{action}")
        data = payload.get("data")
        return data if isinstance(data, str) else None

    async def get_node_rrddata(self, node_name: str, timeframe: str) -> list[dict]:
        payload = await self._get_json(f"/api2/json/nodes/{node_name}/rrddata?timeframe={timeframe}")
        data = payload.get("data")
        return data if isinstance(data, list) else []

    async def get_kvm_vnc_proxy(self, node_name: str, vmid: int) -> dict:
        payload = await self._post_json(f"/api2/json/nodes/{node_name}/qemu/{vmid}/vncproxy")
        return payload.get("data") or {}
