import uuid
from typing import AsyncGenerator
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import Base
from app.models.user import User
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB, ARRAY as PG_ARRAY

@compiles(PG_UUID, "sqlite")
def compile_pg_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

@compiles(PG_JSONB, "sqlite")
def compile_pg_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(PG_ARRAY, "sqlite")
def compile_pg_array_sqlite(type_, compiler, **kw):
    return "JSON"

# In-memory async SQLite engine with static pool for isolated testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh, clean database session for each test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """FastAPI test client with database dependency overridden."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def user_a(db_session: AsyncSession) -> User:
    """Creates primary test user A."""
    user = User(
        id=uuid.uuid4(),
        email="developer_a@securecontrol.local",
        name="Developer A",
        password_hash=hash_password("DevPassword123!"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def user_b(db_session: AsyncSession) -> User:
    """Creates secondary test user B to test ownership isolation."""
    user = User(
        id=uuid.uuid4(),
        email="developer_b@securecontrol.local",
        name="Developer B",
        password_hash=hash_password("DevPassword456!"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
def token_user_a(user_a: User) -> str:
    """Returns valid JWT for User A."""
    return create_access_token(subject=str(user_a.id))


@pytest_asyncio.fixture(scope="function")
def token_user_b(user_b: User) -> str:
    """Returns valid JWT for User B."""
    return create_access_token(subject=str(user_b.id))


@pytest_asyncio.fixture(scope="function")
async def async_client(client: AsyncClient) -> AsyncClient:
    """Alias fixture for client."""
    return client


@pytest_asyncio.fixture(scope="function")
def test_user_token(token_user_a: str) -> str:
    """Alias fixture for token_user_a."""
    return token_user_a
