import pytest

from app.core.crypto import clear_cache, decrypt_token, encrypt_token


def test_encrypt_decrypt_roundtrip() -> None:
    original = "my-pve-api-token-secret"
    encrypted = encrypt_token(original)
    assert encrypted != original
    assert decrypt_token(encrypted) == original


def test_encrypt_produces_different_ciphertext_each_call() -> None:
    secret = "same-secret"
    a = encrypt_token(secret)
    b = encrypt_token(secret)
    assert a != b
    assert decrypt_token(a) == decrypt_token(b) == secret


def test_decrypt_invalid_ciphertext_raises() -> None:
    with pytest.raises(Exception):
        decrypt_token("not-valid-fernet-token")


def test_clear_cache_resets_fernet_instance(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_cache()
    enc1 = encrypt_token("test")
    clear_cache()
    enc2 = encrypt_token("test")
    assert decrypt_token(enc1) == "test"
    assert decrypt_token(enc2) == "test"
