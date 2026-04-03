# 轻量级 PVE 管理系统

面向 PVE 场景的轻量级管理系统，采用前后端分离结构。

## 目录结构

- `backend/`：Python FastAPI 后端服务
- `frontend/`：React + Vite 前端应用
- `compose.yaml`：本地开发与容器编排入口
- `docs/`：系统约束与接口基线文档

## 主要能力

- 本地账号登录、会话管理与首次登录强制改密
- 管理员节点接入与版本校验（PVE `8.2.2` / `9.1.1`）
- 用户管理与虚拟机授权
- KVM 列表、详情、监控与电源操作
- 嵌入式 VNC/noVNC 控制台（全屏、剪贴板、Ctrl+Alt+Del）
- Token Secret 加密存储、TLS 校验、安全 Cookie 等安全基线
- 统一后端错误模型（401/403/404/409/422/502）

## 开发与验证

### 前端

```bash
cd frontend
npm test -- --run
npm run build
```

### 后端

```bash
cd backend
python -m pytest
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 容器启动

```bash
docker compose up --build
```

## 进度追踪

详细的待办、进行中和已完成事项见 [PLAN.md](PLAN.md)。
