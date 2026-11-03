"""
Asynchronous Load Testing & Latency Benchmarking Engine.
Strictly addresses Point 19: Load testing absent.

Executes concurrent synthetic traffic against API endpoints, computing:
- RPS (Requests per second)
- Latency percentiles: P50, P90, P95, P99, Min, Max, Mean
- HTTP status code distributions and error rates
"""

import asyncio
from dataclasses import dataclass, field
import json
import logging
import statistics
import time
from typing import Any, Callable, Dict, List, Optional
import httpx

logger = logging.getLogger("load-test")


@dataclass
class RequestResult:
    status_code: int
    duration_ms: float
    success: bool
    error: Optional[str] = None


@dataclass
class LoadTestSummary:
    total_requests: int
    successful_requests: int
    failed_requests: int
    concurrency: int
    duration_seconds: float
    rps: float
    p50_ms: float
    p90_ms: float
    p95_ms: float
    p99_ms: float
    min_ms: float
    max_ms: float
    mean_ms: float
    status_distribution: Dict[int, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "concurrency": self.concurrency,
            "duration_seconds": round(self.duration_seconds, 3),
            "requests_per_second": round(self.rps, 1),
            "latency_p50_ms": round(self.p50_ms, 2),
            "latency_p90_ms": round(self.p90_ms, 2),
            "latency_p95_ms": round(self.p95_ms, 2),
            "latency_p99_ms": round(self.p99_ms, 2),
            "latency_min_ms": round(self.min_ms, 2),
            "latency_max_ms": round(self.max_ms, 2),
            "latency_mean_ms": round(self.mean_ms, 2),
            "status_distribution": self.status_distribution,
        }


class AsyncLoadTester:
    """Runs concurrent load test against HTTP endpoints."""

    def __init__(self, concurrency: int = 10, total_requests: int = 100):
        self.concurrency = concurrency
        self.total_requests = total_requests

    async def run(
        self,
        request_func: Callable[[], Any],
    ) -> LoadTestSummary:
        semaphore = asyncio.Semaphore(self.concurrency)
        results: List[RequestResult] = []

        async def worker() -> None:
            async with semaphore:
                start = time.perf_counter()
                try:
                    res = await request_func()
                    duration_ms = (time.perf_counter() - start) * 1000
                    status = getattr(res, "status_code", 200)
                    is_ok = 200 <= status < 400
                    results.append(RequestResult(status_code=status, duration_ms=duration_ms, success=is_ok))
                except Exception as exc:
                    duration_ms = (time.perf_counter() - start) * 1000
                    results.append(RequestResult(status_code=500, duration_ms=duration_ms, success=False, error=str(exc)))

        wall_clock_start = time.perf_counter()
        tasks = [asyncio.create_task(worker()) for _ in range(self.total_requests)]
        await asyncio.gather(*tasks)
        wall_clock_duration = max(time.perf_counter() - wall_clock_start, 0.001)

        durations = [r.duration_ms for r in results]
        durations.sort()

        def percentile(n: float) -> float:
            if not durations:
                return 0.0
            k = (len(durations) - 1) * (n / 100.0)
            f = int(k)
            c = min(f + 1, len(durations) - 1)
            d = k - f
            return durations[f] + d * (durations[c] - durations[f])

        status_counts: Dict[int, int] = {}
        successful = 0
        for r in results:
            status_counts[r.status_code] = status_counts.get(r.status_code, 0) + 1
            if r.success:
                successful += 1

        return LoadTestSummary(
            total_requests=len(results),
            successful_requests=successful,
            failed_requests=len(results) - successful,
            concurrency=self.concurrency,
            duration_seconds=wall_clock_duration,
            rps=len(results) / wall_clock_duration,
            p50_ms=percentile(50),
            p90_ms=percentile(90),
            p95_ms=percentile(95),
            p99_ms=percentile(99),
            min_ms=durations[0] if durations else 0.0,
            max_ms=durations[-1] if durations else 0.0,
            mean_ms=statistics.mean(durations) if durations else 0.0,
            status_distribution=status_counts,
        )


async def benchmark_endpoint(
    client: httpx.AsyncClient,
    path: str,
    method: str = "GET",
    concurrency: int = 10,
    total_requests: int = 100,
    **kwargs: Any,
) -> LoadTestSummary:
    """Convenience helper to benchmark a specific endpoint on an AsyncClient."""
    tester = AsyncLoadTester(concurrency=concurrency, total_requests=total_requests)

    async def _call():
        return await client.request(method=method, url=path, **kwargs)

    return await tester.run(_call)
