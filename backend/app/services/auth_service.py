from __future__ import annotations

from datetime import UTC, datetime

from sqlmodel import Session, select

from app.auth.security import hash_password, verify_password
from app.auth.session import build_session
from app.core.errors import AuthenticationError, ConflictError, PermissionDeniedError
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import BootstrapAdminRequest, BootstrapAdminResponse, UserSummary


def user_to_summary(user: User) -> UserSummary:
    return UserSummary(
        id=user.id or 0,
        username=user.username,
        role=user.role,
        must_change_password=user.must_change_password,
        is_active=user.is_active,
    )


def needs_setup(session: Session) -> bool:
    existing_admin = session.exec(select(User).where(User.role == "admin")).first()
    return existing_admin is None


def bootstrap_admin(session: Session, payload: BootstrapAdminRequest) -> tuple[BootstrapAdminResponse, UserSession]:
    existing_admin = session.exec(select(User).where(User.role == "admin")).first()
    if existing_admin:
        raise ConflictError("管理员已存在，不能重复初始化")

    existing_username = session.exec(select(User).where(User.username == payload.username)).first()
    if existing_username:
        raise ConflictError("用户名已存在")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="admin",
        is_active=True,
        must_change_password=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    auth_session = build_session(user.id or 0)
    session.add(auth_session)
    session.commit()
    session.refresh(auth_session)

    return (
        BootstrapAdminResponse(id=user.id or 0, username=user.username, message="管理员初始化成功"),
        auth_session,
    )


def login_user(session: Session, username: str, password: str) -> tuple[User, UserSession]:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not verify_password(password, user.password_hash):
        raise AuthenticationError("用户名或密码错误")
    if not user.is_active:
        raise PermissionDeniedError("用户已被禁用")

    auth_session = build_session(user.id or 0)
    session.add(auth_session)
    session.commit()
    session.refresh(auth_session)
    return user, auth_session


def get_user_by_session_token(session: Session, session_token: str) -> User | None:
    auth_session = session.exec(select(UserSession).where(UserSession.session_token == session_token)).first()
    if not auth_session:
        return None
    if auth_session.expires_at <= datetime.now(UTC):
        session.delete(auth_session)
        session.commit()
        return None
    return session.get(User, auth_session.user_id)


def change_password(session: Session, user: User, current_password: str, new_password: str) -> User:
    if not verify_password(current_password, user.password_hash):
        raise AuthenticationError("当前密码错误")

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.password_changed_at = datetime.now(UTC)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def logout_session(session: Session, session_token: str) -> None:
    auth_session = session.exec(select(UserSession).where(UserSession.session_token == session_token)).first()
    if auth_session:
        session.delete(auth_session)
        session.commit()
