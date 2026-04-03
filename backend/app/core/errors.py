"""Custom exception hierarchy for the PVE management backend.

Each subclass maps to a specific HTTP status code so that the global
exception handler can produce the correct response automatically.
"""


class AppError(Exception):
    """Base exception for all application-level errors."""

    status_code: int = 500

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    status_code = 404


class PermissionDeniedError(AppError):
    status_code = 403


class AuthenticationError(AppError):
    status_code = 401


class ConflictError(AppError):
    status_code = 409


class ValidationError(AppError):
    status_code = 422


class UpstreamError(AppError):
    status_code = 502
