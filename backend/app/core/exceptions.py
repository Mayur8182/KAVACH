import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("secure-control-plane")


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class DatabaseConnectionError(AppException):
    def __init__(self, message: str = "Database connection unavailable", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="DATABASE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class DependencyUnavailableError(AppException):
    def __init__(self, dependency_name: str, message: str, details: Optional[Any] = None):
        super().__init__(
            message=f"Required dependency '{dependency_name}' is unavailable: {message}",
            code="DEPENDENCY_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class NotFoundError(AppException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{entity_id}' was not found",
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


def create_error_response(
    code: str,
    message: str,
    status_code: int,
    details: Optional[Any] = None,
    request_id: Optional[str] = None,
) -> JSONResponse:
    """Formats a standardized error payload with correlation ID support."""
    payload: Dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    if request_id:
        payload["error"]["request_id"] = request_id
    if details is not None:
        payload["error"]["details"] = details
    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(status_code=status_code, content=payload, headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    """Registers centralized exception handlers on the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        logger.warning(
            f"AppException [{exc.code}]: {exc.message}",
            extra={"event": "app_exception", "code": exc.code, "status_code": exc.status_code, "request_id": req_id},
        )
        return create_error_response(
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            details=exc.details,
            request_id=req_id,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        logger.info(
            f"Request validation failed on {request.url.path}",
            extra={"event": "validation_error", "errors": exc.errors(), "request_id": req_id},
        )
        return create_error_response(
            code="VALIDATION_ERROR",
            message="Invalid request payload or query parameters",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=exc.errors(),
            request_id=req_id,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        return create_error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            status_code=exc.status_code,
            request_id=req_id,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None)
        logger.error(
            f"Unhandled exception during {request.method} {request.url.path}: {str(exc)}",
            exc_info=True,
            extra={"event": "unhandled_exception", "request_id": req_id},
        )
        import traceback
        tb = traceback.format_exc()
        return create_error_response(
            code="INTERNAL_SERVER_ERROR",
            message=f"An unexpected server error occurred: {str(exc)}",
            details=tb,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            request_id=req_id,
        )

