# 部署指南

## 架构概览

```
用户浏览器 → frontend (React, :5173) → backend (FastAPI, :8000) → PVE 节点 API
```

前端开发服务器代理 API 请求到后端。生产环境中前端构建为静态资源，由后端或独立 Web 服务器托管。

## 本地开发

### 前置条件

- Python 3.12+
- Node.js 22+
- npm

### 启动顺序

**1. 启动后端**

```bash
cd backend
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

后端启动后：
- 自动创建 SQLite 数据库（默认 `/data/app.db`，开发模式下 `backend/app.db`）
- 监听 `http://localhost:8000`

**2. 启动前端**

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器监听 `http://localhost:5173`，API 请求自动代理到后端。

**3. 初始化管理员**

首次部署需要通过 API 创建管理员账号：

```bash
curl -X POST http://localhost:8000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-secure-password"}'
```

管理员首次登录后会被强制要求修改密码。

### 验证

```bash
# 健康检查
curl http://localhost:8000/api/health

# 支持的 PVE 版本
curl http://localhost:8000/api/meta/pve-versions
```

## Docker Compose 部署

### 快速启动

```bash
docker compose up --build -d
```

此命令会：
1. 构建后端镜像（Python 3.12 + FastAPI）
2. 构建前端镜像（Node 22 + Vite 开发服务器）
3. 启动两个容器，前端依赖后端

### 配置

通过环境变量覆盖默认配置。编辑 `compose.yaml` 中的 `environment` 部分：

```yaml
services:
  backend:
    environment:
      PVE_PANEL_ENVIRONMENT: production    # 必须改为 production
      PVE_PANEL_SECRET_KEY: "your-random-secret-key-here"  # 必须设置
      PVE_PANEL_SQLITE_PATH: /data/app.db
      PVE_PANEL_DEBUG: "false"
      PVE_PANEL_PVE_TLS_VERIFY: "true"
      PVE_PANEL_PVE_TLS_CA_PATH: ""        # 可选：自定义 CA 证书路径
    volumes:
      - backend_data:/data                  # 数据库持久化
```

### 生产环境清单

- [ ] `PVE_PANEL_ENVIRONMENT` 设为 `production`
- [ ] `PVE_PANEL_SECRET_KEY` 设置为强随机密钥（用于会话签名和 Token 加密）
- [ ] `PVE_PANEL_DEBUG` 设为 `false`
- [ ] 数据卷 `backend_data` 已正确挂载
- [ ] 防火墙仅开放必要端口（前端 5173 或反向代理端口）
- [ ] 如果使用反向代理，配置 WebSocket 代理支持 VNC

### 常用命令

```bash
# 启动
docker compose up --build -d

# 查看日志
docker compose logs -f

# 停止
docker compose down

# 停止并删除数据卷（⚠️ 会清除数据库）
docker compose down -v

# 仅重建后端
docker compose up --build -d backend
```

## 环境变量参考

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PVE_PANEL_ENVIRONMENT` | `development` | `development` 或 `production` |
| `PVE_PANEL_SECRET_KEY` | `change-me` | 会话签名与 Token 加密密钥，**生产环境必须设置** |
| `PVE_PANEL_DEBUG` | `false` | 开启 SQL 日志等调试信息 |
| `PVE_PANEL_SQLITE_PATH` | `/data/app.db` | SQLite 数据库文件路径 |
| `PVE_PANEL_PVE_TLS_VERIFY` | `true` | 是否校验 PVE 节点 TLS 证书 |
| `PVE_PANEL_PVE_TLS_CA_PATH` | — | 自定义 CA 证书路径 |

## 反向代理示例（Nginx）

```nginx
server {
    listen 80;
    server_name pve-panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # VNC WebSocket 代理
    location /api/user/kvms/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

## 故障排查

### 后端启动失败：`非开发环境必须显式设置安全的 PVE_PANEL_SECRET_KEY`

生产环境要求显式设置密钥。添加环境变量 `PVE_PANEL_SECRET_KEY` 为一个安全的随机字符串。

### 节点接入失败：`PVE TLS 校验失败或传输异常`

PVE 节点使用自签名证书时，可设置 `PVE_PANEL_PVE_TLS_CA_PATH` 指向 CA 证书路径，或将 `PVE_PANEL_PVE_TLS_VERIFY` 设为 `false`（不推荐用于生产环境）。

### VNC 连接失败

确保反向代理支持 WebSocket 长连接，`proxy_read_timeout` 建议设为 3600 秒以上。

### 数据库迁移

当前使用 SQLModel 自动建表，无独立迁移工具。如需修改表结构：
1. 开发环境：删除 `app.db` 重新创建
2. 生产环境：备份数据库后手动执行 SQL ALTER 语句
