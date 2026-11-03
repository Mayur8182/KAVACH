"""
Step 18 Cloud API Rate Limiter and Token Bucket.
"""

import asyncio
import time
from typing import Dict


class CloudRateLimiter:
    """
    Per-provider token-bucket rate limiter to avoid triggering provider 429 / Throttling.
    """
    def __init__(self, rate_per_second: float = 10.0, burst: int = 20):
        self.rate = rate_per_second
        self.burst = burst
        self.tokens = float(burst)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)

            if self.tokens < 1.0:
                wait_time = (1.0 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0.0
            else:
                self.tokens -= 1.0


# Provider-level global rate limiters
_limiters: Dict[str, CloudRateLimiter] = {
    "AWS": CloudRateLimiter(rate_per_second=15.0, burst=30),
    "AZURE": CloudRateLimiter(rate_per_second=10.0, burst=20),
    "GCP": CloudRateLimiter(rate_per_second=15.0, burst=30),
}


def get_provider_rate_limiter(provider: str) -> CloudRateLimiter:
    return _limiters.get(provider.upper(), _limiters["AWS"])
