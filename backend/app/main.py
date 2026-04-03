from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.core.config import settings
from app.core.errors import AppError
from app.db.session import init_db
from app.models.permission import UserVMPermission
from app.models.pve_node import PVENode
from app.models.session import UserSession
from app.models.user import User


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
