# 项目计划

此文件用于跟踪当前轻量级 PVE 管理系统的实现进度，便于跨会话继续开发。

## 待办

- 无。

## 已完成

- [x] P2：补齐安全配置、异常分支、PVE 客户端失败路径的后端测试，删除占位测试 `backend/tests/test_placeholder.py`。
- [x] P2：补充部署、环境变量、接口示例与故障排查文档（`docs/deployment.md`）。
- [x] 持续稳定新的前后端分离实现，并补齐剩余功能缺口。
- [x] P1：统一 `README.md`、`backend/README.md` 与 `PLAN.md` 的项目状态描述，建立单一事实来源（`PLAN.md` 为权威进度源，README 面向读者概览并引用 PLAN.md）。
- [x] P0：引入默认安全的 TLS 校验策略，补齐 `pve_tls_verify` 与 `pve_tls_ca_path` 配置及对应测试。
- [x] P0：移除默认弱密钥与非安全 Cookie 默认值，要求部署时显式提供安全的 `PVE_PANEL_SECRET_KEY`，并区分开发/生产配置。
- [x] P0：改造 PVE 节点 `token_secret` 的明文存储方式，使用 Fernet 对称加密（AES-128-CBC）保护存储的 token_secret，密钥派生自 `PVE_PANEL_SECRET_KEY`。
- [x] P1：统一后端错误模型，收口 `backend/app/api/routes.py` 中重复的 `ValueError -> HTTPException` 映射。
- [x] P1：梳理并细化后端错误边界，区分参数错误（422）、权限错误（403）、认证错误（401）、资源不存在（404）、重复冲突（409）、PVE 上游连接错误（502）。

- [x] Create persistent task tracker in repository.
- [x] Add initial `docs/pve-api-baseline.md` with fixed-version and mismatch-blocking rules.
- [x] Scaffold initial isolated Python backend skeleton under `backend/`.
- [x] Add initial isolated frontend skeleton under `frontend/`.
- [x] Add initial Dockerfiles and `compose.yaml` for isolated backend/frontend services.
- [x] Add SQLite data model for users, sessions, PVE nodes, and user VM permissions.
- [x] Implement fixed supported PVE version metadata endpoint.
- [x] Implement real PVE version probe via `/api2/json/version` with mismatch blocking.
- [x] Implement initial admin node create/list APIs.
- [x] Implement local login, session cookie, current-user lookup, and bootstrap admin flow.
- [x] Implement password change API with first-login password-change support.
- [x] Implement admin user create/list/status APIs.
- [x] Implement VM permission assignment and per-user permission listing APIs.
- [x] Implement authorized user KVM listing API backed by local permissions and PVE node inventory.
- [x] Implement authorized KVM detail API for basic info, read-only config, and read-only network data.
- [x] Implement authorized KVM power actions for start / shutdown / stop.
- [x] Implement KVM current metrics API.
- [x] Implement node monitoring API for day/week CPU, memory, disk, and network data.
- [x] Implement VNC bootstrap API foundation for authorized KVM access.
- [x] Implement admin node inventory API so node initialization and later inspection can read the node's KVM list.
- [x] Validate permission assignment against the actual KVM inventory on the selected node.
- [x] Scaffold shadcn-style frontend shell with Chinese login, KVM list, KVM detail workspace, monitoring summary, password change flow, and initial admin permission UI.
- [x] Split the frontend into routed user/admin pages with lazy-loaded route boundaries, reusable app shell, and route guards.
- [x] Build dedicated admin user-management and admin node/permission pages under the routed frontend.
- [x] Add frontend Vitest coverage for admin node inventory loading and permission assignment interactions.
- [x] Add backend pytest coverage for node inventory loading, node validation, permission assignment validation, and thin admin route error mapping.
- [x] 为嵌入式 VNC/noVNC 控制台补齐全屏、剪贴板、Ctrl+Alt+Del 的前端行为与前后端测试覆盖。
- [x] 为认证、路由守卫、KVM 详情加载与 VNC 相关链路补齐更广泛的前后端回归测试覆盖。
- [x] 收口新的前后端分离实现中的状态清理与稳定性问题，避免 KVM 详情、监控与 VNC 引导信息在切换或失败后残留旧状态。
- [x] 删除旧 Go dashboard 的低风险链路：login、settings、account。
- [x] 为保留的旧 `index`、`config`、`backups` 页面添加迁移提示。
- [x] 从旧 `index` 页面和实例卡片中移除 `config`、`backups`、`console`、`create`、`delete` 和电源操作入口。
- [x] 清理旧 `index` 链路中的死代码，包括实例链接字段、操作弹窗和废弃的实例卡片脚本状态。
- [x] 一次性删除剩余旧 `index` 路由、页面壳、片段模板、实例卡片模板和页面脚本。
- [x] 一次性删除旧 `backups` 路由、页面壳、片段模板和页面脚本。
- [x] 一次性删除剩余旧 `config` 路由、页面壳、片段模板、共享模板和页面脚本。
- [x] 删除旧 Go dashboard 的最终运行时残留，包括旧二进制入口、应用启动层、嵌入式静态资源和 systemd 服务文件。
- [x] Confirm backend stack: Python.
- [x] Confirm deployment mode: Docker Compose.
- [x] Confirm auth model: local panel accounts.
- [x] Confirm node auth mode: PVE API Token.
- [x] Confirm supported PVE versions for first phase: `8.2.2` and `9.1.1`.
- [x] Confirm version mismatch rule: block save when selected version differs from detected version.
- [x] Confirm first phase scope is QEMU/KVM only.
- [x] Confirm VNC is embedded and must include fullscreen, clipboard, and Ctrl+Alt+Del.
- [x] Confirm node monitoring scope: CPU, memory, disk, network for day/week views.
- [x] Confirm KVM disk monitoring is from the host/PVE perspective.
- [x] Confirm UI language is Chinese.
- [x] Confirm users can change their own password.
- [x] Confirm first login must force password change.
- [x] Confirm system config and NIC info are read-only in phase one.

## 阻塞

- 无。
