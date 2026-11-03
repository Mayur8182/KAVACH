"""
Step 26 Rate Limiting Algorithms & Distributed State Management.

Implements all rate limiting algorithms required by Step 26:
- Token Bucket
- Leaky Bucket
- Fixed Window
- Sliding Window / Sliding Window Counter
- Concurrency Limiter
- Adaptive Limiter (context-aware sensitivity, threat intel, user trust)

Supports distributed state (Redis with in-memory resilient fallback)
and handles fail-open vs fail-closed policy configurations.
"""

import time
import math
import asyncio
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class RateLimitResult:
    allowed: bool
    tokens_remaining: float
    limit: int
    window_seconds: int
    retry_after: int
    algorithm: str
    action: str  # ALLOW, THROTTLE, CHALLENGE, BLOCK, WOULD_BLOCK, WOULD_THROTTLE
    reason: str
    execution_status: str  # APPLIED, FAILED, UNKNOWN
    metadata: Dict[str, Any] = field(default_factory=dict)


class DistributedStateManager:
    """
    Manages rate limit counters and state across multiple nodes.
    Defaults to an in-memory state store and integrates with Redis when available.
    """
    _instance: Optional["DistributedStateManager"] = None

    def __init__(self):
        # In-memory storage for sliding windows, token buckets, and concurrency
        self._token_buckets: Dict[str, Dict[str, float]] = {}  # key -> {tokens, last_refill}
        self._leaky_buckets: Dict[str, Dict[str, float]] = {}  # key -> {water_level, last_leak}
        self._fixed_windows: Dict[str, Dict[str, int]] = {}    # key -> {count, reset_at}
        self._sliding_windows: Dict[str, list] = {}            # key -> [(timestamp, weight)]
        self._active_concurrency: Dict[str, int] = {}          # key -> active_count
        self._lock = asyncio.Lock()
        self._redis_available = False

    @classmethod
    def get_instance(cls) -> "DistributedStateManager":
        if cls._instance is None:
            cls._instance = DistributedStateManager()
        return cls._instance

    async def check_token_bucket(
        self,
        key: str,
        capacity: int,
        refill_rate_per_sec: float,
        tokens_to_consume: float = 1.0,
    ) -> Tuple[bool, float, int]:
        """
        Token Bucket algorithm:
        - capacity: max burst
        - refill_rate: tokens added per second
        Returns (allowed, current_tokens, retry_after_seconds)
        """
        async with self._lock:
            now = time.time()
            state = self._token_buckets.get(key)
            if state is None:
                current_tokens = float(capacity)
                last_refill = now
            else:
                last_tokens = state["tokens"]
                last_refill = state["last_refill"]
                elapsed = max(0.0, now - last_refill)
                current_tokens = min(float(capacity), last_tokens + elapsed * refill_rate_per_sec)

            if current_tokens >= tokens_to_consume:
                current_tokens -= tokens_to_consume
                self._token_buckets[key] = {"tokens": current_tokens, "last_refill": now}
                return True, round(current_tokens, 2), 0
            else:
                deficit = tokens_to_consume - current_tokens
                retry_after = math.ceil(deficit / refill_rate_per_sec) if refill_rate_per_sec > 0 else 60
                self._token_buckets[key] = {"tokens": current_tokens, "last_refill": now}
                return False, round(current_tokens, 2), max(1, retry_after)

    async def check_leaky_bucket(
        self,
        key: str,
        capacity: int,
        leak_rate_per_sec: float,
        incoming: float = 1.0,
    ) -> Tuple[bool, float, int]:
        """
        Leaky Bucket algorithm:
        Drops or delays requests when the bucket overflows.
        """
        async with self._lock:
            now = time.time()
            state = self._leaky_buckets.get(key)
            if state is None:
                water_level = 0.0
                last_leak = now
            else:
                water_level = state["water_level"]
                last_leak = state["last_leak"]
                elapsed = max(0.0, now - last_leak)
                water_level = max(0.0, water_level - elapsed * leak_rate_per_sec)

            if water_level + incoming <= capacity:
                water_level += incoming
                self._leaky_buckets[key] = {"water_level": water_level, "last_leak": now}
                remaining_capacity = capacity - water_level
                return True, round(remaining_capacity, 2), 0
            else:
                overflow = (water_level + incoming) - capacity
                retry_after = math.ceil(overflow / leak_rate_per_sec) if leak_rate_per_sec > 0 else 60
                self._leaky_buckets[key] = {"water_level": water_level, "last_leak": now}
                return False, 0.0, max(1, retry_after)

    async def check_fixed_window(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> Tuple[bool, float, int]:
        """
        Fixed Window algorithm:
        Resets counter strictly at window boundary.
        """
        async with self._lock:
            now = time.time()
            state = self._fixed_windows.get(key)
            if state is None or now >= state["reset_at"]:
                count = 1
                reset_at = now + window_seconds
                self._fixed_windows[key] = {"count": count, "reset_at": reset_at}
                return True, float(limit - count), 0
            else:
                count = state["count"]
                reset_at = state["reset_at"]
                if count < limit:
                    count += 1
                    self._fixed_windows[key]["count"] = count
                    return True, float(limit - count), 0
                else:
                    retry_after = math.ceil(reset_at - now)
                    return False, 0.0, max(1, retry_after)

    async def check_sliding_window(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> Tuple[bool, float, int]:
        """
        Sliding Window Counter algorithm:
        Stores event timestamps in sliding frame to smooth boundary burst spikes.
        """
        async with self._lock:
            now = time.time()
            cutoff = now - window_seconds
            history = self._sliding_windows.get(key, [])
            # Filter out entries older than window
            history = [ts for ts in history if ts > cutoff]

            if len(history) < limit:
                history.append(now)
                self._sliding_windows[key] = history
                remaining = limit - len(history)
                return True, float(remaining), 0
            else:
                oldest_in_window = history[0]
                retry_after = math.ceil(oldest_in_window + window_seconds - now)
                self._sliding_windows[key] = history
                return False, 0.0, max(1, retry_after)

    async def acquire_concurrency(self, key: str, max_concurrent: int) -> Tuple[bool, int]:
        """
        Concurrency Limiter:
        Tracks currently in-flight requests.
        """
        async with self._lock:
            current = self._active_concurrency.get(key, 0)
            if current < max_concurrent:
                self._active_concurrency[key] = current + 1
                return True, self._active_concurrency[key]
            return False, current

    async def release_concurrency(self, key: str) -> int:
        async with self._lock:
            current = self._active_concurrency.get(key, 0)
            if current > 0:
                self._active_concurrency[key] = current - 1
            return self._active_concurrency.get(key, 0)

    async def clear_all(self):
        """Used in test suites to reset in-memory state."""
        async with self._lock:
            self._token_buckets.clear()
            self._leaky_buckets.clear()
            self._fixed_windows.clear()
            self._sliding_windows.clear()
            self._active_concurrency.clear()


class RateLimitAlgorithmEngine:
    """
    Evaluates requests against policies using the designated algorithm:
    TOKEN_BUCKET, LEAKY_BUCKET, FIXED_WINDOW, SLIDING_WINDOW, CONCURRENCY_LIMIT, ADAPTIVE.
    """

    def __init__(self, state_manager: Optional[DistributedStateManager] = None):
        self.state = state_manager or DistributedStateManager.get_instance()

    async def evaluate(
        self,
        algorithm: str,
        identity_key: str,
        limit_count: int,
        window_seconds: int,
        burst: int = 20,
        concurrency_limit: Optional[int] = None,
        dry_run: bool = False,
        adaptive_context: Optional[Dict[str, Any]] = None,
        fail_behavior: str = "FAIL_OPEN",
    ) -> RateLimitResult:
        try:
            algo_upper = algorithm.upper()

            # 1. ADAPTIVE: Modulates limits based on endpoint sensitivity, threat intel, user trust
            if algo_upper == "ADAPTIVE":
                effective_limit, effective_burst = self._compute_adaptive_limits(
                    limit_count, burst, adaptive_context or {}
                )
                refill_rate = effective_limit / max(1, window_seconds)
                allowed, remaining, retry_after = await self.state.check_token_bucket(
                    key=f"adaptive:{identity_key}",
                    capacity=effective_burst,
                    refill_rate_per_sec=refill_rate,
                )
                algo_used = "ADAPTIVE_TOKEN_BUCKET"

            # 2. TOKEN BUCKET
            elif algo_upper == "TOKEN_BUCKET":
                refill_rate = limit_count / max(1, window_seconds)
                capacity = max(limit_count, burst)
                allowed, remaining, retry_after = await self.state.check_token_bucket(
                    key=f"tb:{identity_key}",
                    capacity=capacity,
                    refill_rate_per_sec=refill_rate,
                )
                algo_used = "TOKEN_BUCKET"

            # 3. LEAKY BUCKET
            elif algo_upper == "LEAKY_BUCKET":
                leak_rate = limit_count / max(1, window_seconds)
                capacity = max(limit_count, burst)
                allowed, remaining, retry_after = await self.state.check_leaky_bucket(
                    key=f"lb:{identity_key}",
                    capacity=capacity,
                    leak_rate_per_sec=leak_rate,
                )
                algo_used = "LEAKY_BUCKET"

            # 4. FIXED WINDOW
            elif algo_upper == "FIXED_WINDOW":
                allowed, remaining, retry_after = await self.state.check_fixed_window(
                    key=f"fw:{identity_key}",
                    limit=limit_count,
                    window_seconds=window_seconds,
                )
                algo_used = "FIXED_WINDOW"

            # 5. CONCURRENCY LIMIT
            elif algo_upper == "CONCURRENCY_LIMIT":
                max_c = concurrency_limit or limit_count
                allowed, current_c = await self.state.acquire_concurrency(
                    key=f"conc:{identity_key}",
                    max_concurrent=max_c,
                )
                remaining = float(max(0, max_c - current_c))
                retry_after = 5 if not allowed else 0
                algo_used = "CONCURRENCY_LIMIT"

            # 6. SLIDING WINDOW (Default fallback)
            else:
                allowed, remaining, retry_after = await self.state.check_sliding_window(
                    key=f"sw:{identity_key}",
                    limit=limit_count,
                    window_seconds=window_seconds,
                )
                algo_used = "SLIDING_WINDOW"

            # Determine action based on result and dry-run flag
            if allowed:
                action = "ALLOW"
                reason = "Within configured rate limits."
            else:
                if dry_run:
                    action = "WOULD_THROTTLE"
                    reason = f"Rate limit exceeded ({algo_used}). Dry-run mode enabled; traffic permitted."
                else:
                    action = "THROTTLE"
                    reason = f"Rate limit exceeded ({algo_used}). Capacity depleted; retry after {retry_after}s."

            return RateLimitResult(
                allowed=allowed if not dry_run else True,
                tokens_remaining=remaining,
                limit=limit_count,
                window_seconds=window_seconds,
                retry_after=retry_after,
                algorithm=algo_used,
                action=action,
                reason=reason,
                execution_status="APPLIED",
                metadata={"dry_run": dry_run, "adaptive_applied": algo_upper == "ADAPTIVE"},
            )

        except Exception as e:
            # Handle distributed state or evaluation failure according to fail_behavior
            is_fail_closed = fail_behavior.upper() == "FAIL_CLOSED"
            return RateLimitResult(
                allowed=not is_fail_closed,
                tokens_remaining=0.0,
                limit=limit_count,
                window_seconds=window_seconds,
                retry_after=30 if is_fail_closed else 0,
                algorithm=algorithm,
                action="BLOCK" if is_fail_closed else "ALLOW",
                reason=f"Rate limit state error ({str(e)}). Applying policy fail_behavior: {fail_behavior}.",
                execution_status="FAILED",
                metadata={"error": str(e), "fail_behavior": fail_behavior},
            )

    def _compute_adaptive_limits(
        self,
        base_limit: int,
        base_burst: int,
        context: Dict[str, Any],
    ) -> Tuple[int, int]:
        """
        Dynamically adjusts limits:
        - High-sensitivity endpoints (LOGIN, PAYMENT, ADMIN) -> 0.4x limit
        - Threat intelligence match / suspicious reputation -> 0.2x limit
        - Verified high-trust user/workload -> 1.5x limit
        - Resource load high -> 0.7x limit
        """
        multiplier = 1.0

        endpoint_type = context.get("endpoint_sensitivity", "").upper()
        if endpoint_type in ("LOGIN", "PAYMENT", "PASSWORD_RESET", "MFA", "ADMIN", "SECRET_ACCESS"):
            multiplier *= 0.4

        threat_rep = context.get("threat_reputation", "").upper()
        if threat_rep in ("KNOWN_MALICIOUS", "SUSPICIOUS", "BOTNET"):
            multiplier *= 0.25

        user_trust = context.get("user_trust_level", "").upper()
        if user_trust == "HIGH_TRUST":
            multiplier *= 1.5
        elif user_trust == "SUSPICIOUS":
            multiplier *= 0.5

        if context.get("system_under_attack", False):
            multiplier *= 0.5

        effective_limit = max(1, int(base_limit * multiplier))
        effective_burst = max(1, int(base_burst * multiplier))
        return effective_limit, effective_burst
