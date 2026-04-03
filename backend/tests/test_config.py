import importlib
import os
import sys

import pytest


MODULE_NAME = 'app.core.config'


def reload_config_module(monkeypatch: pytest.MonkeyPatch, **env: str):
    for key in ['PVE_PANEL_ENVIRONMENT', 'PVE_PANEL_SECRET_KEY', 'PVE_PANEL_FORCE_HTTPS_COOKIES']:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    sys.modules.pop(MODULE_NAME, None)
    module = importlib.import_module(MODULE_NAME)
    return module


def test_development_defaults_allow_change_me_and_disable_secure_cookie(monkeypatch: pytest.MonkeyPatch) -> None:
    module = reload_config_module(monkeypatch, PVE_PANEL_ENVIRONMENT='development')

    assert module.settings.secret_key == 'change-me'
    assert module.settings.force_https_cookies is False


def test_production_requires_secure_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    sys.modules.pop(MODULE_NAME, None)
    monkeypatch.setenv('PVE_PANEL_ENVIRONMENT', 'production')
    monkeypatch.setenv('PVE_PANEL_SECRET_KEY', 'change-me')

    with pytest.raises(ValueError, match='PVE_PANEL_SECRET_KEY'):
        importlib.import_module(MODULE_NAME)


def test_production_enables_secure_cookie_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    module = reload_config_module(
        monkeypatch,
        PVE_PANEL_ENVIRONMENT='production',
        PVE_PANEL_SECRET_KEY='super-secret-key',
    )

    assert module.settings.force_https_cookies is True


def test_force_https_cookie_can_be_overridden(monkeypatch: pytest.MonkeyPatch) -> None:
    module = reload_config_module(
        monkeypatch,
        PVE_PANEL_ENVIRONMENT='development',
        PVE_PANEL_FORCE_HTTPS_COOKIES='true',
    )

    assert module.settings.force_https_cookies is True


def test_pve_tls_verify_defaults_to_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    module = reload_config_module(monkeypatch, PVE_PANEL_ENVIRONMENT='development')

    assert module.settings.pve_tls_verify is True
    assert module.settings.pve_tls_ca_path is None


def test_pve_tls_ca_path_can_be_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    module = reload_config_module(
        monkeypatch,
        PVE_PANEL_ENVIRONMENT='production',
        PVE_PANEL_SECRET_KEY='super-secret-key',
        PVE_PANEL_PVE_TLS_CA_PATH='/etc/ssl/custom-ca.pem',
    )

    assert module.settings.pve_tls_ca_path is not None
    assert module.settings.pve_tls_ca_path.name == 'custom-ca.pem'
