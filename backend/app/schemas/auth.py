from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserSummary(BaseModel):
    id: int
    username: str
    role: str
    must_change_password: bool
    is_active: bool


class LoginResponse(BaseModel):
    message: str
    user: UserSummary


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=8, max_length=256)


class BootstrapAdminRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)


class BootstrapAdminResponse(BaseModel):
    id: int
    username: str
    message: str


class SetupStatusResponse(BaseModel):
    needs_setup: bool
