from unittest.mock import AsyncMock, patch
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_liveness_probe_returns_200():
    """Liveness probe must return 200 OK and status 'ok' without external dependencies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_readiness_probe_returns_503_when_database_fails():
    """Readiness probe must return 503 Service Unavailable when PostgreSQL is unreachable (Rule: Never fake success)."""
    mock_db_failure = {
        "healthy": False,
        "latency_ms": 1.25,
        "details": "Database connection refused on localhost:5432",
    }
    with patch("app.api.v1.health.check_database_connection", new_callable=AsyncMock) as mock_ping:
        mock_ping.return_value = mock_db_failure
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health/ready")
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "not_ready"
            assert "postgresql" in data["dependencies"]
            assert data["dependencies"]["postgresql"]["status"] == "unhealthy"
            assert "connection refused" in data["dependencies"]["postgresql"]["details"]


@pytest.mark.asyncio
async def test_readiness_probe_returns_200_when_database_healthy():
    """Readiness probe must return 200 OK when PostgreSQL returns valid ping."""
    mock_db_success = {
        "healthy": True,
        "latency_ms": 2.1,
        "details": "PostgreSQL connection verified via ping query (SELECT 1)",
    }
    with patch("app.api.v1.health.check_database_connection", new_callable=AsyncMock) as mock_ping:
        mock_ping.return_value = mock_db_success
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ready"
            assert data["dependencies"]["postgresql"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_request_correlation_id_middleware():
    """X-Request-ID header must be generated and propagated in response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Client sends custom request ID
        custom_id = "req-test-trace-12345"
        response = await client.get("/api/v1/health/live", headers={"X-Request-ID": custom_id})
        assert response.status_code == 200
        assert response.headers.get("X-Request-ID") == custom_id

        # Client omits request ID -> system generates one
        response_auto = await client.get("/api/v1/health/live")
        assert response_auto.status_code == 200
        assert "X-Request-ID" in response_auto.headers
        assert len(response_auto.headers["X-Request-ID"]) > 10
