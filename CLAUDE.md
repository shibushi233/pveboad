# CLAUDE.md

本仓库当前是一个轻量级 PVE 管理系统，采用前后端分离结构。

## 当前结构

- `backend/`：Python FastAPI 后端
- `frontend/`：React + Vite 前端
- `compose.yaml`：本地与容器编排入口
- `docs/`：当前系统相关设计与约束文档

## 常用命令

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

## 开发说明

- UI 文案默认使用中文。
- 当前主线是新前后端系统，旧 Go dashboard 已从仓库中移除。
- 修改后优先使用前端 Vitest 与后端 pytest 做验证。
- 若涉及节点接入、授权或 VNC，先对照 `PLAN.md` 与 `docs/pve-api-baseline.md` 再改代码。

## 当前重点

- 完成嵌入式 VNC/noVNC 页面能力
- 补齐认证、路由加载、KVM 详情与 VNC 流程回归覆盖
- 持续稳定前后端分离后的新实现
