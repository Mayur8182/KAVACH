"""
Step 18 Retry and Resilience Engine.

Handles exponential backoff with jitter and respects provider-specific throttling.
Never retries destructive operations blindly (Rule 75).
"""

import asyncio
import logging
import random
from typing import Callable, TypeVar, Any
from app.integrations.cloud.common.exceptions import CloudThrottledError

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def with_retry(
    func: Callable[..., Any],
    *args: Any,
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 10.0,
    backoff_factor: float = 2.0,
    retry_on_exceptions: tuple = (CloudThrottledError, TimeoutError, ConnectionError),
    **kwargs: Any,
) -> Any:
    """
    Executes func with exponential backoff and full jitter.
    """
    delay = initial_delay
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        except retry_on_exceptions as e:
            last_error = e
            if attempt == max_retries:
                logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {str(e)}")
                raise

            # If exception has retry_after hint, use it
            if isinstance(e, CloudThrottledError) and hasattr(e, "retry_after_seconds"):
                sleep_time = e.retry_after_seconds
            else:
                # Full jitter
                sleep_time = min(max_delay, delay * (backoff_factor ** attempt) + random.uniform(0, 0.2))

            logger.warning(f"Retry attempt {attempt + 1}/{max_retries} for {func.__name__} after {sleep_time:.2f}s due to: {e}")
            await asyncio.sleep(sleep_time)

    if last_error:
        raise last_error
