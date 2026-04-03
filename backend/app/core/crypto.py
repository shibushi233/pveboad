"""Symmetric encryption for PVE node token secrets using Fernet (AES-128-CBC).

The encryption key is derived from ``settings.secret_key`` via a fixed
KDF derivation so that rotating ``PVE_PANEL_SECRET_KEY`` transparently
rotates the encryption key.
"""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings

_FERNET_CACHE: Fernet | None = None


def _get_fernet() -> Fernet:
    global _FERNET_CACHE
    if _FERNET_CACHE is not None:
        return _FERNET_CACHE

    raw = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(raw)
    _FERNET_CACHE = Fernet(key)
    return _FERNET_CACHE


def encrypt_token(plaintext: str) -> str:
    """Encrypt a PVE API token secret and return the Fernet token string."""
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a previously encrypted PVE API token secret."""
    return _get_fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")


def clear_cache() -> None:
    """Clear the cached Fernet instance (used in tests)."""
    global _FERNET_CACHE
    _FERNET_CACHE = None
