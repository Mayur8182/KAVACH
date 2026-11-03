"""
Production Resilience Engine — Circuit Breakers, Jittered Retries & External Timeout Controls.
Addresses:
- Point 14: External API latency ke liye timeout nahi.
- Point 15: Retry storm se downstream service overload.
"""

import asyncio
import enum
import logging
import random
import time
from typing import Any, Callable, Coroutine, Dict, Optional, Type, TypeVar, Union
import httpx

logger = logging.getLogger("resilience")

T = TypeVar("T")


class CircuitState(str, enum.Enum):
    CLOSED = "CLOSED"        # Normal operation: traffic allowed
    OPEN = "OPEN"            # Downstream unhealthy: all calls fail fast
    HALF_OPEN = "HALF_OPEN"  # Testing recovery: trial calls allowed


class CircuitBreakerError(Exception):
    """Raised when an operation is rejected because the circuit breaker is open."""
    def __init__(self, name: str, retry_after_s: float):
        super().__init__(f"Circuit breaker '{name}' is OPEN. Downstream service unavailable. Retry after {retry_after_s:.1f}s")
        self.name = name
        self.retry_after_s = retry_after_s


class CircuitBreaker:
    """
    Stateful circuit breaker protecting downstream services from cascading failure.
    Tracks error rates and fails fast when failure threshold is exceeded.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_time_seconds: float = 30.0,
        expected_exceptions: tuple = (httpx.TransportError, httpx.TimeoutException, TimeoutError, ConnectionError),
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self.expected_exceptions = expected_exceptions

        self.state: CircuitState = CircuitState.CLOSED
        self.failure_count: int = 0
        self.success_count: int = 0
        self.last_failure_time: float = 0.0
        self._lock = asyncio.Lock()

    async def _update_state(self) -> None:
        now = time.monotonic()
        if self.state == CircuitState.OPEN:
            if now - self.last_failure_time >= self.recovery_time_seconds:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info(f"[CircuitBreaker:{self.name}] Transitioned from OPEN to HALF_OPEN (trial)")

    async def record_success(self) -> None:
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= 2:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    logger.info(f"[CircuitBreaker:{self.name}] Service recovered. Transitioned to CLOSED")
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0

    async def record_failure(self, exc: Exception) -> None:
        async with self._lock:
            self.last_failure_time = time.monotonic()
            self.failure_count += 1
            if self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
                if self.failure_count >= self.failure_threshold or self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.OPEN
                    logger.warning(
                        f"[CircuitBreaker:{self.name}] Failure threshold reached ({self.failure_count}). "
                        f"Circuit tripped to OPEN for {self.recovery_time_seconds}s. Error: {exc}"
                    )

    async def check_allowed(self) -> None:
        async with self._lock:
            await self._update_state()
            if self.state == CircuitState.OPEN:
                remaining = max(0.0, self.recovery_time_seconds - (time.monotonic() - self.last_failure_time))
                raise CircuitBreakerError(self.name, remaining)

    async def execute(self, func: Callable[..., Coroutine[Any, Any, T]], *args: Any, **kwargs: Any) -> T:
        """Executes coroutine guarded by circuit breaker state."""
        await self.check_allowed()
        try:
            result = await func(*args, **kwargs)
            await self.record_success()
            return result
        except self.expected_exceptions as exc:
            await self.record_failure(exc)
            raise


# Registry of global circuit breakers by downstream target
_BREAKERS: Dict[str, CircuitBreaker] = {}


def get_circuit_breaker(name: str) -> CircuitBreaker:
    if name not in _BREAKERS:
        _BREAKERS[name] = CircuitBreaker(name=name)
    return _BREAKERS[name]


async def retry_with_jitter(
    operation: Callable[..., Coroutine[Any, Any, T]],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    retry_exceptions: tuple = (httpx.TransportError, httpx.TimeoutException, TimeoutError, ConnectionError),
    **kwargs: Any,
) -> T:
    """
    Executes an async operation with exponential backoff and FULL JITTER.
    Formula: wait_time = uniform(0, min(max_delay, base_delay * 2^attempt))
    Full jitter prevents retry storms where thousands of requests retry at identical intervals.
    """
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return await operation(*args, **kwargs)
        except retry_exceptions as exc:
            last_exc = exc
            if attempt >= max_retries:
                logger.error(f"[RetryWithJitter] Exhausted all {max_retries} retries. Final error: {exc}")
                raise

            # Full jitter calculation
            ceiling = min(max_delay, base_delay * (2 ** attempt))
            sleep_time = random.uniform(0.1, ceiling)
            logger.warning(
                f"[RetryWithJitter] Attempt {attempt + 1}/{max_retries} failed ({exc.__class__.__name__}: {exc}). "
                f"Backing off with jitter for {sleep_time:.2f}s"
            )
            await asyncio.sleep(sleep_time)

    assert last_exc is not None
    raise last_exc


async def resilient_http_request(
    method: str,
    url: str,
    service_name: str = "external-api",
    timeout_seconds: float = 15.0,
    max_retries: int = 2,
    **kwargs: Any,
) -> httpx.Response:
    """
    Resilient HTTP call combining:
    1. Mandatory strict connect & read timeouts (no indefinite hanging).
    2. Circuit breaker protection (fail fast if service is down).
    3. Exponential backoff with full jitter (no retry storms).
    """
    timeout = httpx.Timeout(
        timeout=timeout_seconds,
        connect=min(5.0, timeout_seconds),
        read=timeout_seconds,
        write=5.0,
        pool=5.0,
    )
    breaker = get_circuit_breaker(service_name)

    async def _send_request() -> httpx.Response:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(method=method, url=url, **kwargs)
            # Tripping breaker on 502/503/504 gateway failures
            if resp.status_code in (502, 503, 504):
                raise httpx.TransportError(f"Downstream service returned HTTP {resp.status_code}")
            return resp

    async def _execute_guarded() -> httpx.Response:
        return await breaker.execute(_send_request)

    return await retry_with_jitter(
        _execute_guarded,
        max_retries=max_retries,
        base_delay=0.5,
        max_delay=8.0,
    )
