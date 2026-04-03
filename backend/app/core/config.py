from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "轻量级 PVE 管理系统"
    api_prefix: str = "/api"
    environment: str = "development"
    debug: bool = False
    secret_key: str = "change-me"
    force_https_cookies: bool | None = None
    pve_tls_verify: bool = True
    pve_tls_ca_path: Path | None = None

    sqlite_path: Path = Field(default=Path("/data/app.db"))

    allowed_pve_versions: tuple[str, ...] = ("8.2.2", "9.1.1")

    model_config = SettingsConfigDict(
        env_prefix="PVE_PANEL_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.sqlite_path.as_posix()}"

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @model_validator(mode="after")
    def validate_security_defaults(self) -> "Settings":
        if self.force_https_cookies is None:
            self.force_https_cookies = not self.is_development

        if not self.is_development and self.secret_key == "change-me":
            raise ValueError("非开发环境必须显式设置安全的 PVE_PANEL_SECRET_KEY，不能使用 change-me")

        return self


settings = Settings()
