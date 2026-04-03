from pydantic import BaseModel, Field


class AdminUserCreateRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    role: str = Field(default="user", pattern="^(admin|user)$")


class AdminUserListItem(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    must_change_password: bool


class AdminUserUpdateStatusRequest(BaseModel):
    is_active: bool
