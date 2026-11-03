"""
Thing Control Plane — Request Idempotency Gateway & Middleware
Strict compliance with Checklist Item #83:
"No idempotency — Retry se duplicate payment/job/resource create."
Also addresses Checklist Items #79 (Race conditions) and #80 (Duplicate API calls).

Clients provide an `Idempotency-Key` or `X-Idempotency-Key` header on mutating
requests (POST, PUT, PATCH). If a retry or duplicate request is detected within
the TTL cache window (1 hour), the middleware returns the cached response
without re-executing business logic or creating duplicate records.
"""

import time
import hashlib
import json
import logging
from typing import Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

logger = logging.getLogger("idempotency")

# In-memory store: idempotency_key -> { status_code, headers, body, timestamp, state }
_IDEMPOTENCY_STORE: Dict[str, Dict[str, Any]] = {}
IDEMPOTENCY_TTL_SECONDS = 3600.0  # 1 hour retention


def cleanup_stale_idempotency_entries() -> None:
    now = time.time()
    stale = [k for k, v in _IDEMPOTENCY_STORE.items() if now - v.get("timestamp", 0) > IDEMPOTENCY_TTL_SECONDS]
    for k in stale:
        del _IDEMPOTENCY_STORE[k]


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    HTTP middleware intercepting mutating calls with Idempotency-Key.
    Guarantees that retry calls return cached responses and prevents concurrent duplicates.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only evaluate on mutating HTTP methods
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
        if not idempotency_key:
            return await call_next(request)

        # Scoped key combines path, method, and key
        scoped_key = f"{request.method}:{request.url.path}:{idempotency_key}"
        cleanup_stale_idempotency_entries()

        existing = _IDEMPOTENCY_STORE.get(scoped_key)
        if existing:
            # Check if execution is currently in progress
            if existing.get("state") == "IN_PROGRESS":
                request_id = getattr(request.state, "request_id", "")
                return StarletteResponse(
                    content=json.dumps({
                        "error": {
                            "code": "IDEMPOTENCY_CONCURRENT_MUTATION",
                            "message": "A request with this Idempotency-Key is currently being processed. Please wait for completion.",
                            "request_id": request_id,
                        }
                    }),
                    status_code=409,
                    media_type="application/json",
                    headers={"Retry-After": "2"},
                )

            # Replay cached response
            cached_body = existing.get("body", b"")
            cached_status = existing.get("status_code", 200)
            cached_media_type = existing.get("media_type", "application/json")

            logger.info(
                f"Idempotency cache hit for {scoped_key} — returning cached response",
                extra={"event": "idempotency_replay", "key": idempotency_key},
            )
            return StarletteResponse(
                content=cached_body,
                status_code=cached_status,
                media_type=cached_media_type,
                headers={
                    "X-Cache-Lookup": "IDEMPOTENT_REPLAY",
                    "Idempotency-Key": idempotency_key,
                },
            )

        # Mark in progress
        _IDEMPOTENCY_STORE[scoped_key] = {
            "state": "IN_PROGRESS",
            "timestamp": time.time(),
        }

        try:
            response = await call_next(request)

            # Cache responses (2xx and 4xx, but not 5xx internal server crashes)
            if response.status_code < 500:
                # Read response body stream
                body_bytes = b""
                async for chunk in response.body_iterator:
                    body_bytes += chunk

                _IDEMPOTENCY_STORE[scoped_key] = {
                    "state": "COMPLETED",
                    "status_code": response.status_code,
                    "media_type": response.media_type or "application/json",
                    "body": body_bytes,
                    "timestamp": time.time(),
                }

                # Return fresh response reconstructed from read body
                headers = dict(response.headers)
                headers["Idempotency-Key"] = idempotency_key
                return StarletteResponse(
                    content=body_bytes,
                    status_code=response.status_code,
                    media_type=response.media_type,
                    headers=headers,
                )

            # On 5xx, discard in-progress entry so client can retry cleanly
            _IDEMPOTENCY_STORE.pop(scoped_key, None)
            return response

        except Exception:
            _IDEMPOTENCY_STORE.pop(scoped_key, None)
            raise
