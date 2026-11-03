"""
Thing Control Plane — Rate Limiting Engine & Middleware
Strict compliance with Checklist Item #84:
"Missing rate limiting — Public API abuse ya excessive requests ko control nahi karti."

Implements sliding-window token tracking per IP / authenticated token with standard
X-RateLimit headers and 429 Too Many Requests responses.
"""

import time
import math
import logging
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("rate-limiter")

# Path-specific limits (requests per minute window)
SENSITIVE_ENDPOINTS: Dict[str, int] = {
    "/api/v1/auth/token": 20,
    "/api/v1/auth/login": 20,
    "/api/v1/auth/register": 10,
    "/api/v1/auth/forgot-password": 10,
    "/api/v1/auth/reset-password": 10,
    "/api/v1/auth/verify-email": 20,
    "/api/v1/auth/mfa/setup": 15,
    "/api/v1/auth/mfa/verify": 15,
    "/api/v1/auth/mfa/recovery": 10,
    "/api/v1/account/password": 15,
    "/api/v1/account/change-password": 15,
}

# Paths completely excluded from rate limiting
EXCLUDED_PREFIXES: Tuple[str, ...] = (
    "/health",
    "/ready",
    "/live",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)

DEFAULT_RATE_LIMIT_PER_MINUTE = 180
WINDOW_SECONDS = 60.0


class SlidingWindowRateLimiter:
    """In-memory sliding-window log rate limiter with automatic stale key eviction."""

    def __init__(self):
        # Maps key -> list of float timestamps (monotonic seconds)
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.monotonic()

    def _cleanup_old_entries(self, now: float) -> None:
        """Periodically purge entries older than window from all tracked clients."""
        if now - self._last_cleanup > 30.0:
            cutoff = now - WINDOW_SECONDS
            stale_keys = []
            for k, timestamps in self._requests.items():
                self._requests[k] = [t for t in timestamps if t > cutoff]
                if not self._requests[k]:
                    stale_keys.append(k)
            for k in stale_keys:
                del self._requests[k]
            self._last_cleanup = now

    def check_rate_limit(
        self, client_key: str, limit: int
    ) -> Tuple[bool, int, float, int]:
        """
        Evaluates current rate limit for client.
        Returns:
            (allowed: bool, remaining: int, reset_time_epoch: float, retry_after: int)
        """
        now_mono = time.monotonic()
        now_epoch = time.time()
        self._cleanup_old_entries(now_mono)

        cutoff = now_mono - WINDOW_SECONDS
        timestamps = [t for t in self._requests[client_key] if t > cutoff]
        self._requests[client_key] = timestamps

        current_count = len(timestamps)
        reset_time_epoch = now_epoch + WINDOW_SECONDS

        if current_count >= limit:
            oldest_relevant = timestamps[0] if timestamps else now_mono
            retry_after = max(1, math.ceil(WINDOW_SECONDS - (now_mono - oldest_relevant)))
            return False, 0, reset_time_epoch, retry_after

        # Record this request
        self._requests[client_key].append(now_mono)
        remaining = max(0, limit - current_count - 1)
        return True, remaining, reset_time_epoch, 0


# Global singleton limiter
rate_limiter_instance = SlidingWindowRateLimiter()


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    HTTP middleware enforcing sliding-window rate limits across all incoming API routes.
    Emits X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Check exemptions
        for prefix in EXCLUDED_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # Resolve client key (token if authenticated, else client host IP)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Rate limit by token identifier
            client_key = f"tok:{auth_header[-16:]}"
        else:
            client_ip = request.client.host if request.client else "unknown"
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            client_key = f"ip:{client_ip}"

        # Resolve limit for path
        limit = DEFAULT_RATE_LIMIT_PER_MINUTE
        for sensitive_path, s_limit in SENSITIVE_ENDPOINTS.items():
            if path.startswith(sensitive_path):
                limit = s_limit
                client_key = f"{client_key}:{sensitive_path}"
                break

        allowed, remaining, reset_epoch, retry_after = rate_limiter_instance.check_rate_limit(
            client_key, limit
        )

        if not allowed:
            request_id = getattr(request.state, "request_id", "")
            logger.warning(
                f"Rate limit exceeded for {client_key} on {path} (limit={limit})",
                extra={"event": "rate_limit_exceeded", "path": path, "client_key": client_key},
            )
            return JSONResponse(
                status_code=429,
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(reset_epoch)),
                    "Retry-After": str(retry_after),
                    "X-Request-ID": request_id,
                },
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Maximum {limit} requests per minute allowed on this endpoint. Please retry in {retry_after} seconds.",
                        "request_id": request_id,
                        "details": {
                            "limit": limit,
                            "window_seconds": int(WINDOW_SECONDS),
                            "retry_after_seconds": retry_after,
                        },
                    }
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_epoch))
        return response
