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

import os

# Resolve database URL robustly (especially for SQLite file paths and MongoDB URLs)
raw_db_url = settings.database_url
if raw_db_url.startswith(("mongodb://", "mongodb+srv://")):
    # SQLAlchemy requires an async SQL dialect, whereas MongoDB is managed by app.core.mongo
    if not getattr(settings, "mongodb_url", None):
        settings.mongodb_url = raw_db_url
    raw_db_url = getattr(settings, "sql_database_url", "sqlite+aiosqlite:///backend/dev.db")

if raw_db_url.startswith("sqlite+aiosqlite:///"):
    sqlite_path = raw_db_url.replace("sqlite+aiosqlite:///", "")
    # If not absolute, search in expected locations
    if not os.path.isabs(sqlite_path) and not os.path.exists(sqlite_path):
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dev.db")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend", "dev.db")),
            os.path.abspath("dev.db"),
            os.path.abspath("backend/dev.db"),
        ]
        for c in candidates:
            if os.path.exists(c):
                clean_path = c.replace("\\", "/")
                raw_db_url = f"sqlite+aiosqlite:///{clean_path}"
                break

engine_kwargs: Dict[str, Any] = {
    "echo": False,
    "pool_pre_ping": True,
}
if "sqlite" not in raw_db_url:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 40
    engine_kwargs["pool_recycle"] = 1800  # Recycle connections after 30 minutes to prevent stale dropped connections
    engine_kwargs["pool_timeout"] = 30.0  # Timeout for acquiring a connection from pool
else:
    engine_kwargs["connect_args"] = {"timeout": 60.0, "check_same_thread": False}

from sqlalchemy import event

# Create Async Engine with health pre-ping
engine: AsyncEngine = create_async_engine(
    raw_db_url,
    **engine_kwargs,
)

if "sqlite" in raw_db_url:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=60000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")  # 64MB in-memory page cache (ultra fast)
            cursor.execute("PRAGMA temp_store=MEMORY")   # In-memory temporary tables & indices
            cursor.execute("PRAGMA mmap_size=268435456") # 256MB zero-copy memory-mapped I/O
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

_session_factory = None


def get_session_factory():
    """Returns the active async session factory (defaults to AsyncSessionLocal, overridable in tests)."""
    global _session_factory
    if _session_factory is not None:
        return _session_factory
    return AsyncSessionLocal


def set_session_factory(factory):
    """Sets a custom session factory (e.g. TestingSessionLocal for tests)."""
    global _session_factory
    _session_factory = factory


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
