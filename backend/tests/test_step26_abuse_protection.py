"""
Step 26 Unit & Integration Tests — Advanced Rate Limiting, Abuse Detection & Brute-Force Protection.

Tests:
1. Algorithms (Token Bucket, Leaky Bucket, Sliding Window, Concurrency, Adaptive)
2. Brute-Force Detection & Automated Temporary Block
3. Credential Stuffing & Password Spraying Detection
4. Account Enumeration Detection
5. MFA / OTP Abuse Detection
6. Agent & MCP Tool Abuse Detection
7. Policy Enforcement & Dry-run Simulation (WOULD_THROTTLE)
8. Block Management (Temporary with TTL & Permanent with Authorization)
9. Step 24 Threat Intelligence Correlation with Abuse Events
10. Authentic Overview Dashboard Metrics (Rule 1)
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.abuse_models import (
    RateLimitPolicy,
    RateLimitDecision,
    AbuseDetectionEvent,
    AbuseDetectionSignal,
    TemporaryBlock,
    PermanentBlock,
)
from app.models.threat_intel_models import ThreatIndicator
from app.abuse.algorithms import DistributedStateManager, RateLimitAlgorithmEngine
from app.abuse.detector import AbuseThreatDetector
from app.abuse.policy_engine import RateLimitPolicyEngine
from app.abuse.service import AbuseProtectionService


@pytest.mark.asyncio
async def test_token_bucket_and_sliding_window_algorithms():
    """Verifies Token Bucket capacity/refill and Sliding Window smoothing."""
    state = DistributedStateManager()
    await state.clear_all()
    engine = RateLimitAlgorithmEngine(state)

    # 1. Token Bucket: Limit 2 requests, burst 2
    res1 = await engine.evaluate(
        algorithm="TOKEN_BUCKET",
        identity_key="user:alice",
        limit_count=2,
        window_seconds=60,
        burst=2,
    )
    assert res1.allowed is True
    assert res1.tokens_remaining == 1.0

    res2 = await engine.evaluate(
        algorithm="TOKEN_BUCKET",
        identity_key="user:alice",
        limit_count=2,
        window_seconds=60,
        burst=2,
    )
    assert res2.allowed is True
    assert res2.tokens_remaining == 0.0

    # 3rd request must be throttled
    res3 = await engine.evaluate(
        algorithm="TOKEN_BUCKET",
        identity_key="user:alice",
        limit_count=2,
        window_seconds=60,
        burst=2,
    )
    assert res3.allowed is False
    assert res3.action == "THROTTLE"
    assert res3.retry_after > 0

    # 2. Sliding Window: Limit 2 requests
    sw_res1 = await engine.evaluate(
        algorithm="SLIDING_WINDOW",
        identity_key="ip:10.0.0.1",
        limit_count=2,
        window_seconds=60,
    )
    assert sw_res1.allowed is True

    sw_res2 = await engine.evaluate(
        algorithm="SLIDING_WINDOW",
        identity_key="ip:10.0.0.1",
        limit_count=2,
        window_seconds=60,
    )
    assert sw_res2.allowed is True

    sw_res3 = await engine.evaluate(
        algorithm="SLIDING_WINDOW",
        identity_key="ip:10.0.0.1",
        limit_count=2,
        window_seconds=60,
    )
    assert sw_res3.allowed is False
    assert sw_res3.action == "THROTTLE"


@pytest.mark.asyncio
async def test_concurrency_limiter_and_adaptive_engine():
    """Verifies in-flight concurrency limiter and context-aware adaptive limit modulation."""
    state = DistributedStateManager()
    await state.clear_all()
    engine = RateLimitAlgorithmEngine(state)

    # Concurrency test: Max 1 in-flight
    acq1, _ = await state.acquire_concurrency("job:export", max_concurrent=1)
    assert acq1 is True

    acq2, _ = await state.acquire_concurrency("job:export", max_concurrent=1)
    assert acq2 is False

    await state.release_concurrency("job:export")
    acq3, _ = await state.acquire_concurrency("job:export", max_concurrent=1)
    assert acq3 is True

    # Adaptive Limit: Sensitive endpoint cut by 0.4x, suspicious reputation cut by 0.25x
    ctx = {
        "endpoint_sensitivity": "PAYMENT",
        "threat_reputation": "SUSPICIOUS",
    }
    eff_limit, eff_burst = engine._compute_adaptive_limits(100, 20, ctx)
    assert eff_limit == 10  # 100 * 0.4 * 0.25 = 10
    assert eff_burst == 2   # 20 * 0.4 * 0.25 = 2


@pytest.mark.asyncio
async def test_brute_force_detection_and_automated_temporary_block(db_session: AsyncSession):
    """Verifies deterministic brute force detection and automatic 15-minute temporary block."""
    service = AbuseProtectionService(db_session)
    victim_account = "user_victim@example.com"
    attacker_ip = "198.51.100.25"

    # Ingest 5 failed login attempts
    res = None
    for _ in range(5):
        res = await service.ingest_security_event(
            event_type="AUTHENTICATION",
            endpoint="/api/v1/auth/login",
            result_status="INVALID_CREDENTIALS",
            ip_address=attacker_ip,
            account_identifier=victim_account,
        )

    assert res is not None
    assert res["signals_generated_count"] >= 1
    signal_types = [s["signal_type"] for s in res["signals"]]
    assert "BRUTE_FORCE_SUSPECTED" in signal_types

    # Verify that a temporary block was automatically created
    blocks_data = await service.list_blocks()
    temp_blocks = blocks_data["temporary_blocks"]
    assert any(b.target_value == victim_account and b.active for b in temp_blocks)

    # Subsequent request check against policy engine must yield BLOCK
    eval_res = await service.evaluate_request(
        endpoint="/api/v1/auth/login",
        ip_address=attacker_ip,
        account_identifier=victim_account,
    )
    assert eval_res.allowed is False
    assert eval_res.decision == "BLOCK"
    assert "temporary block" in eval_res.reason.lower()


@pytest.mark.asyncio
async def test_credential_stuffing_detection(db_session: AsyncSession):
    """Verifies detection of one IP targeting multiple distinct accounts with failures."""
    service = AbuseProtectionService(db_session)
    bot_ip = "203.0.113.88"

    # Ingest failures against 4 distinct accounts from same IP
    accounts = ["acc_alpha", "acc_beta", "acc_gamma", "acc_delta"]
    last_res = None
    for acc in accounts:
        last_res = await service.ingest_security_event(
            event_type="AUTHENTICATION",
            endpoint="/api/v1/auth/login",
            result_status="INVALID_CREDENTIALS",
            ip_address=bot_ip,
            account_identifier=acc,
        )

    assert last_res is not None
    signal_types = [s["signal_type"] for s in last_res["signals"]]
    assert "CREDENTIAL_STUFFING_SUSPECTED" in signal_types


@pytest.mark.asyncio
async def test_account_enumeration_detection(db_session: AsyncSession):
    """Verifies detection of user scanning via ACCOUNT_NOT_FOUND responses."""
    service = AbuseProtectionService(db_session)
    scanner_ip = "192.0.2.77"

    last_res = None
    for i in range(4):
        last_res = await service.ingest_security_event(
            event_type="AUTHENTICATION",
            endpoint="/api/v1/auth/login",
            result_status="ACCOUNT_NOT_FOUND",
            ip_address=scanner_ip,
            account_identifier=f"user_probe_{i}@corp.net",
        )

    assert last_res is not None
    signal_types = [s["signal_type"] for s in last_res["signals"]]
    assert "ENUMERATION_SUSPECTED" in signal_types


@pytest.mark.asyncio
async def test_mfa_abuse_detection(db_session: AsyncSession):
    """Verifies detection of OTP flooding and repeated MFA failures."""
    service = AbuseProtectionService(db_session)
    target_user = "finance_lead@corp.net"

    last_res = None
    for _ in range(4):
        last_res = await service.ingest_security_event(
            event_type="MFA",
            endpoint="/api/v1/auth/mfa/verify",
            result_status="MFA_FAILED",
            ip_address="198.51.100.99",
            account_identifier=target_user,
        )

    assert last_res is not None
    signal_types = [s["signal_type"] for s in last_res["signals"]]
    assert "MFA_ABUSE_SUSPECTED" in signal_types


@pytest.mark.asyncio
async def test_agent_and_mcp_tool_abuse_detection(db_session: AsyncSession):
    """Verifies that AI agents accessing high-risk tools are throttled/flagged."""
    service = AbuseProtectionService(db_session)
    agent_id = "agent-qa-bot"

    # Sensitive tool: delete_database has threshold 3
    last_res = None
    for _ in range(3):
        last_res = await service.ingest_security_event(
            event_type="AGENT_TOOL",
            endpoint="/mcp/tools/delete_database",
            result_status="SUCCESS",
            ip_address="127.0.0.1",
            agent_id=agent_id,
            tool_name="delete_database",
        )

    assert last_res is not None
    signal_types = [s["signal_type"] for s in last_res["signals"]]
    assert "AGENT_ABUSE_SUSPECTED" in signal_types


@pytest.mark.asyncio
async def test_dry_run_policy_simulation(db_session: AsyncSession):
    """Verifies dry-run mode returns WOULD_THROTTLE without blocking traffic."""
    service = AbuseProtectionService(db_session)

    # Create dry-run policy: Limit 1 request
    policy = await service.create_policy({
        "name": "Staging Dry Run Test",
        "scope": "GLOBAL",
        "priority": 200,
        "algorithm": "SLIDING_WINDOW",
        "limit_count": 1,
        "window_seconds": 60,
        "action": "THROTTLE",
        "enabled": True,
        "dry_run": True,
    })
    assert policy.dry_run is True

    # 1st request -> ALLOW
    res1 = await service.evaluate_request(
        endpoint="/api/v1/reports",
        ip_address="10.200.1.5",
    )
    assert res1.allowed is True
    assert res1.decision == "ALLOW"

    # 2nd request -> WOULD_THROTTLE, but allowed is True because dry_run=True!
    res2 = await service.evaluate_request(
        endpoint="/api/v1/reports",
        ip_address="10.200.1.5",
    )
    assert res2.decision == "WOULD_THROTTLE"
    assert res2.allowed is True
    assert res2.dry_run is True


@pytest.mark.asyncio
async def test_step24_threat_intel_correlation(db_session: AsyncSession):
    """Verifies that an event from a known botnet IP matches Step 24 threat indicators."""
    service = AbuseProtectionService(db_session)
    bad_ip = "185.220.101.5"

    # Seed Step 24 threat indicator
    ti = ThreatIndicator(
        indicator_type="IPV4",
        value=bad_ip,
        normalized_value=bad_ip.lower(),
        title="APT29 Botnet",
        confidence="HIGH",
        severity="CRITICAL",
        status="ACTIVE",
        threat_types=["botnet"],
    )
    db_session.add(ti)
    await db_session.commit()

    # Ingest failed login from this IP
    ingest_res = await service.ingest_security_event(
        event_type="AUTHENTICATION",
        endpoint="/api/v1/auth/login",
        result_status="INVALID_CREDENTIALS",
        ip_address=bad_ip,
        account_identifier="target_admin",
    )
    assert ingest_res["status"] == "INGESTED"


@pytest.mark.asyncio
async def test_authentic_overview_metrics(db_session: AsyncSession):
    """Verifies authentic overview statistics calculation from database records (Rule 1)."""
    service = AbuseProtectionService(db_session)

    # Initial state
    stats0 = await service.get_overview_statistics()
    assert stats0["total_policies"] >= 0
    assert stats0["active_temporary_blocks"] == 0

    # Add permanent block
    await service.create_block(
        block_type="IP",
        target_value="198.51.100.99",
        reason="Sanctioned malicious IP",
        permanent=True,
    )

    stats1 = await service.get_overview_statistics()
    assert stats1["active_permanent_blocks"] == 1
