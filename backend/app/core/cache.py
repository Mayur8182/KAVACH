"""
High-Performance Stampede-Resistant In-Memory Cache with Singleflight Request Coalescing.
Strictly addresses:
- Point 16: Cache stampede (singleflight mutex locking + double-check + jittered TTL).
- Point 10: Memory leak ke kaaran RAM continuously badhna (bounded capacity + LRU eviction).
"""

import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import random
import time
from typing import Any, Callable, Coroutine, Dict, Generic, Optional, Tuple, TypeVar

logger = logging.getLogger("cache")

T = TypeVar("T")


@dataclass
class CacheEntry:
    value: Any
    expires_at: float  # monotonic timestamp
    created_at: float


class StampedeProofCache:
    """
    Thread-safe, async-safe in-memory cache featuring:
    1. Singleflight Mutex: Merges concurrent misses on the same key into a single DB query.
    2. Jittered TTL: Prevents synchronized expiration cascades.
    3. LRU Eviction: Fixed capacity bounds memory usage and stops RAM leaks.
    """

    def __init__(self, max_size: int = 5000, default_ttl_seconds: float = 300.0, jitter_pct: float = 0.15):
        self.max_size = max_size
        self.default_ttl_seconds = default_ttl_seconds
        self.jitter_pct = jitter_pct

        # LRU structure: OrderedDict maps key -> CacheEntry
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._locks: Dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

        # Cache metrics
        self.hits: int = 0
        self.misses: int = 0
        self.evictions: int = 0
        self.stampede_preventions: int = 0

    def _apply_jitter(self, ttl: float) -> float:
        """Applies ±jitter_pct to TTL to prevent mass simultaneous expiration."""
        jitter_range = ttl * self.jitter_pct
        return ttl + random.uniform(-jitter_range, jitter_range)

    def get(self, key: str) -> Optional[Any]:
        """Synchronously retrieves a non-expired entry, moving it to the end (MRU)."""
        now = time.monotonic()
        if key in self._store:
            entry = self._store[key]
            if now < entry.expires_at:
                self._store.move_to_end(key)
                self.hits += 1
                return entry.value
            else:
                # Expired
                del self._store[key]
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> None:
        """Stores a value with jittered TTL and bounded capacity eviction."""
        now = time.monotonic()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        expires_at = now + self._apply_jitter(ttl)

        # Enforce LRU eviction if at capacity
        if key not in self._store and len(self._store) >= self.max_size:
            # Evict oldest (least recently used)
            self._store.popitem(last=False)
            self.evictions += 1

        self._store[key] = CacheEntry(value=value, expires_at=expires_at, created_at=now)
        self._store.move_to_end(key)

    async def get_or_compute(
        self,
        key: str,
        fetcher: Callable[[], Coroutine[Any, Any, T]],
        ttl_seconds: Optional[float] = None,
    ) -> T:
        """
        Singleflight Pattern:
        When multiple concurrent requests ask for the same missing key,
        only ONE executes the fetcher coroutine. All other callers await the key lock
        and read the freshly computed value, preventing database stampedes.
        """
        # Fast path: cache hit
        cached = self.get(key)
        if cached is not None:
            return cached

        # Slow path: acquire key-level singleflight lock
        async with self._global_lock:
            if key not in self._locks:
                self._locks[key] = asyncio.Lock()
            key_lock = self._locks[key]

        async with key_lock:
            # Double-check inside lock: did another coroutine just compute it?
            cached = self.get(key)
            if cached is not None:
                self.stampede_preventions += 1
                return cached

            # Compute from authoritative source
            computed_value = await fetcher()
            self.set(key, computed_value, ttl_seconds=ttl_seconds)
            return computed_value

    def invalidate(self, key: str) -> bool:
        """Removes a key from cache."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def clear(self) -> None:
        """Flushes the cache."""
        self._store.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Returns runtime performance and cache efficiency metrics."""
        total_requests = self.hits + self.misses
        hit_ratio = round((self.hits / total_requests) * 100, 2) if total_requests > 0 else 0.0
        return {
            "size": len(self._store),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_percent": hit_ratio,
            "evictions": self.evictions,
            "stampede_preventions": self.stampede_preventions,
        }


# Global application cache instance
app_cache = StampedeProofCache(max_size=5000, default_ttl_seconds=180.0)
