from sqlmodel import Session, select

from app.auth.security import hash_password
from app.core.errors import ConflictError, NotFoundError
from app.models.user import User
from app.schemas.user_admin import AdminUserCreateRequest, AdminUserListItem


def create_user(session: Session, payload: AdminUserCreateRequest) -> AdminUserListItem:
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise ConflictError("用户名已存在")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        must_change_password=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return AdminUserListItem(
        id=user.id or 0,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


def list_users(session: Session) -> list[AdminUserListItem]:
    users = session.exec(select(User).order_by(User.id.desc())).all()
    return [
        AdminUserListItem(
            id=user.id or 0,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            must_change_password=user.must_change_password,
        )
        for user in users
    ]


def set_user_status(session: Session, user_id: int, is_active: bool) -> AdminUserListItem:
    user = session.get(User, user_id)
    if not user:
        raise NotFoundError("用户不存在")
    user.is_active = is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    return AdminUserListItem(
        id=user.id or 0,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )
