from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.main import create_app
from app.models.user import User


def test_login_route_sets_cookie_and_returns_user(monkeypatch) -> None:
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = create_app()

    def override_get_session():
        with Session(engine) as session:
            yield session

    class AuthSession:
        session_token = 'token-123'

    monkeypatch.setattr(
        'app.api.routes.login_user',
        lambda session, username, password: (
            User(id=1, username=username, password_hash='hashed', role='user', is_active=True, must_change_password=False),
            AuthSession(),
        ),
    )
    monkeypatch.setattr('app.api.routes.settings.force_https_cookies', True)

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session

    client = TestClient(app)
    response = client.post('/api/auth/login', json={'username': 'user1', 'password': 'password123'})

    assert response.status_code == 200
    assert response.json()['user']['username'] == 'user1'
    assert 'pve_panel_session=' in response.headers['set-cookie']
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=lax' in response.headers['set-cookie']
    assert 'Secure' in response.headers['set-cookie']


def test_me_route_returns_current_user() -> None:
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = create_app()

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: User(id=2, username='admin', password_hash='hashed', role='admin', is_active=True, must_change_password=False)

    client = TestClient(app)
    response = client.get('/api/auth/me')

    assert response.status_code == 200
    assert response.json()['username'] == 'admin'
