from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.auth.session import SESSION_COOKIE_NAME
from app.db.session import get_session
from app.models.user import User
from app.services.auth_service import get_user_by_session_token


def get_current_user(
    session: Session = Depends(get_session),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")

    user = get_user_by_session_token(session, session_token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户已被禁用")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return user
