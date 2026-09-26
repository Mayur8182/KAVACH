import logging
import time
from typing import AsyncGenerator, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

logger = logging.getLogger("secure-control-plane")

settings = get_settings()

# Create Async Engine with connection pooling and health pre-ping
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session rollback due to error: {str(e)}", exc_info=True)
            raise
        finally:
            await session.close()


async def check_database_connection() -> Dict[str, Any]:
    """
    Executes a real query against PostgreSQL to check connectivity and roundtrip latency.
    Returns status and metrics. Does not swallow errors.
    """
    start_time = time.perf_counter()
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            val = result.scalar()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if val == 1:
                return {
                    "healthy": True,
                    "latency_ms": latency_ms,
                    "details": "PostgreSQL connection verified via ping query (SELECT 1)",
                }
            return {
                "healthy": False,
                "latency_ms": latency_ms,
                "details": f"Unexpected ping response value: {val}",
            }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(
            f"PostgreSQL connectivity verification failed: {str(exc)}",
            extra={"event": "db_healthcheck_failed", "latency_ms": latency_ms},
        )
        return {
            "healthy": False,
            "latency_ms": latency_ms,
            "details": f"Database unreachable or connection refused: {str(exc)}",
        }


async def close_db_connection() -> None:
    """Disposes engine connection pool on application shutdown."""
    logger.info("Disposing PostgreSQL database engine pool", extra={"event": "db_engine_dispose"})
    await engine.dispose()
