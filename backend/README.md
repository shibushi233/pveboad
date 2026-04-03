# Backend — 轻量级 PVE 管理系统

Python FastAPI 后端，负责本地认证、PVE 节点管理与 KVM 虚拟机授权访问。

## 技术栈

- Python 3.12+ / FastAPI / SQLModel / SQLite
- httpx（PVE API 客户端）、websockets（VNC 代理）
- cryptography（Token Secret 加密存储）
- passlib[bcrypt]（用户密码哈希）

## 本地启动

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 测试

```bash
python -m pytest
```

## 认证流程

1. 首次部署通过 `POST /api/auth/bootstrap-admin` 创建管理员
2. 通过 `POST /api/auth/login` 登录，后端设置 HttpOnly Session Cookie
3. 通过 `GET /api/auth/me` 获取当前用户信息
4. 若 `must_change_password=true`，前端须强制引导用户修改密码
5. 通过 `POST /api/auth/change-password` 修改密码

## API 覆盖

### 认证与用户管理

| 接口 | 说明 |
|------|------|
| `POST /api/auth/bootstrap-admin` | 初始化管理员 |
| `POST /api/auth/login` | 登录 |
| `POST /api/auth/logout` | 登出 |
| `GET /api/auth/me` | 当前用户 |
| `POST /api/auth/change-password` | 修改密码 |
| `POST /api/admin/users` | 创建用户 |
| `GET /api/admin/users` | 用户列表 |
| `PATCH /api/admin/users/{id}/status` | 启用/禁用用户 |

### 节点与权限管理

| 接口 | 说明 |
|------|------|
| `POST /api/admin/nodes/validate` | 验证节点连通性与版本 |
| `POST /api/admin/nodes` | 创建节点 |
| `GET /api/admin/nodes` | 节点列表 |
| `GET /api/admin/nodes/{id}/inventory` | 节点 KVM 清单 |
| `POST /api/admin/permissions` | 授权用户访问 KVM |
| `GET /api/admin/users/{id}/permissions` | 查询用户权限 |

### 用户侧 KVM 与监控

| 接口 | 说明 |
|------|------|
| `GET /api/user/kvms` | 已授权 KVM 列表 |
| `GET /api/user/kvms/{node_id}/{vmid}` | KVM 详情 |
| `POST /api/user/kvms/{node_id}/{vmid}/{action}` | 电源操作（start/shutdown/stop） |
| `GET /api/user/kvms/{node_id}/{vmid}/metrics/current` | 实时指标 |
| `GET /api/user/nodes/{node_id}/metrics/{timeframe}` | 节点监控（day/week） |

### VNC

| 接口 | 说明 |
|------|------|
| `GET /api/user/kvms/{node_id}/{vmid}/vnc` | VNC 引导信息 |
| `WS /api/user/kvms/{node_id}/{vmid}/vnc/ws` | VNC WebSocket 代理 |

## 关键环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PVE_PANEL_SECRET_KEY` | `change-me` | 会话签名与 Token 加密密钥，生产环境必须显式设置 |
| `PVE_PANEL_ENVIRONMENT` | `development` | `development` 或 `production` |
| `PVE_PANEL_SQLITE_PATH` | `/data/app.db` | SQLite 数据库路径 |
| `PVE_PANEL_PVE_TLS_VERIFY` | `true` | 是否校验 PVE 节点 TLS 证书 |
| `PVE_PANEL_PVE_TLS_CA_PATH` | — | 自定义 CA 证书路径 |

## 错误模型

后端使用统一的异常层次，自动映射为对应的 HTTP 状态码：

| 异常类型 | 状态码 | 场景 |
|----------|--------|------|
| `AuthenticationError` | 401 | 认证失败 |
| `PermissionDeniedError` | 403 | 无权限 |
| `NotFoundError` | 404 | 资源不存在 |
| `ConflictError` | 409 | 重复冲突 |
| `ValidationError` | 422 | 参数不合法 |
| `UpstreamError` | 502 | PVE 上游不可达 |
