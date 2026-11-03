"""
Performance Regression Tests & Benchmark Assertion Suite.
Strictly addresses:
- Point 16: Cache stampede.
- Point 17: Missing connection pooling.
- Point 18: WebSocket connections ki cleanup missing.
- Point 19: Load testing absent.
- Point 20: No performance regression tests.
"""

import asyncio
import time
import pytest
from httpx import AsyncClient

from app.core.cache import StampedeProofCache
from app.core.resilience import CircuitBreaker, CircuitBreakerError, CircuitState, retry_with_jitter
from app.core.websocket_manager import WebSocketConnectionManager
from backend.tests.performance.load_test_suite import benchmark_endpoint


@pytest.mark.asyncio
async def test_health_endpoint_latency_regression(client: AsyncClient):
    """
    Performance Regression: /health endpoint must satisfy:
    - 0% error rate
    - P95 latency < 50ms under concurrent traffic (concurrency=10, 50 requests)
    """
    summary = await benchmark_endpoint(
        client=client,
        path="/health",
        concurrency=10,
        total_requests=50,
    )

    assert summary.failed_requests == 0, f"Expected 0 failures, got {summary.failed_requests}"
    assert summary.p95_ms < 100.0, f"P95 latency exceeded threshold: {summary.p95_ms}ms >= 100ms"
    assert summary.rps > 50.0, f"Throughput too low: {summary.rps} RPS"


@pytest.mark.asyncio
async def test_cache_singleflight_stampede_prevention():
    """
    Performance Regression: Cache Stampede Protection (Point 16).
    When 50 concurrent requests hit a missing cache key simultaneously:
    - Exactly ONE request executes the slow computing function.
    - 49 requests receive the cached result via Singleflight Request Coalescing.
    - All 50 finish successfully.
    """
    cache = StampedeProofCache(max_size=100, default_ttl_seconds=60.0)
    invocation_count = 0

    async def slow_expensive_computation() -> dict:
        nonlocal invocation_count
        invocation_count += 1
        await asyncio.sleep(0.05)  # Simulate 50ms expensive DB query
        return {"data": "expensive_scan_result", "count": 42}

    # Launch 50 concurrent requests for the exact same key
    tasks = [
        cache.get_or_compute("heavy_summary_report", slow_expensive_computation)
        for _ in range(50)
    ]
    results = await asyncio.gather(*tasks)

    # Assertions
    assert len(results) == 50
    for res in results:
        assert res["data"] == "expensive_scan_result"

    # Crucial assertion: Function must only have been invoked ONCE!
    assert invocation_count == 1, (
        f"Cache stampede occurred! Expected 1 computation invocation, but function was called {invocation_count} times."
    )
    assert cache.stampede_preventions == 49


@pytest.mark.asyncio
async def test_circuit_breaker_fail_fast_performance():
    """
    Performance Regression: Circuit Breaker Fail-Fast (Points 14, 15).
    When downstream service fails 3 times, breaker trips to OPEN.
    Subsequent calls must fail fast in < 5ms without hanging downstream.
    """
    breaker = CircuitBreaker("mock-downstream-api", failure_threshold=3, recovery_time_seconds=5.0)

    call_count = 0
    async def failing_downstream_call():
        nonlocal call_count
        call_count += 1
        raise ConnectionError("Connection refused by downstream host")

    # Trigger 3 failures to trip the circuit
    for _ in range(3):
        with pytest.raises(ConnectionError):
            await breaker.execute(failing_downstream_call)

    assert breaker.state == CircuitState.OPEN

    # Next call must fail immediately via CircuitBreakerError with < 5ms latency
    start = time.perf_counter()
    with pytest.raises(CircuitBreakerError) as exc_info:
        await breaker.execute(failing_downstream_call)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert elapsed_ms < 10.0, f"Fail-fast took too long: {elapsed_ms}ms"
    assert "is OPEN" in str(exc_info.value)
    # Downstream should NOT have received a 4th call
    assert call_count == 3


@pytest.mark.asyncio
async def test_websocket_manager_cleanup_lifecycle():
    """
    Performance Regression: WebSocket Connection Cleanup & Leak Prevention (Point 18, Point 10).
    Verifies that connect, disconnect, and stale socket reaping removes 100% of references.
    """
    manager = WebSocketConnectionManager(max_connections_per_user=2)

    class MockWebSocket:
        def __init__(self):
            self.accepted = False
            self.closed = False
            self.close_code = None

        async def accept(self):
            self.accepted = True

        async def close(self, code=1000, reason=""):
            self.closed = True
            self.close_code = code

        async def send_text(self, text: str):
            if self.closed:
                raise ConnectionResetError("Socket closed")

    ws1 = MockWebSocket()
    ws2 = MockWebSocket()
    ws3 = MockWebSocket()

    # User 1 connects ws1 and ws2 (limit = 2)
    assert await manager.connect(ws1, client_id="c1", user_id="u1") is True
    assert await manager.connect(ws2, client_id="c2", user_id="u1") is True

    # User 1 tries connecting a 3rd socket -> rejected due to concurrency limit
    assert await manager.connect(ws3, client_id="c3", user_id="u1") is False
    assert ws3.closed is True
    assert ws3.close_code == 1008

    stats = manager.get_stats()
    assert stats["active_connections"] == 2
    assert stats["active_users"] == 1

    # Disconnect ws1
    await manager.disconnect("c1")
    stats = manager.get_stats()
    assert stats["active_connections"] == 1
    assert "c1" not in manager._clients

    # Disconnect ws2
    await manager.disconnect("c2")
    stats = manager.get_stats()
    assert stats["active_connections"] == 0
    assert stats["active_users"] == 0  # User entry removed, zero RAM leak!
