"""
Step 25 Unit & Integration Tests — DNS Security & DNS Threat Protection.

Tests:
1. Domain Normalization, Decomposition & Shannon Entropy (Section 13-15)
2. Deterministic & Statistical DGA Detection (Section 32)
3. DNS Tunneling & Exfiltration Detection (Section 30-31)
4. DNS Beaconing Detection (Section 29)
5. Step 24 Threat Intelligence Correlation with DNS Queries (Section 16)
6. DNS Policy Enforcement & Rule 2 Execution Status Tracking (Section 18-23, 51-52)
7. DNS Threat Signal Escalation to Step 23 SOC (Section 55, Rule 9)
8. Authentic Overview Dashboard Metrics (Section 57, Rule 1)
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.dns_models import (
    DNSDataSource,
    DNSEvent,
    Domain,
    DNSPolicy,
    DNSListEntry,
    DNSDecision,
    DNSSignal,
)
from app.models.threat_intel_models import ThreatIndicator, ThreatIndicatorSource
from app.models.soc_models import SocAlert
from app.dns.normalizer import DomainNormalizer
from app.dns.detector import DNSThreatDetector
from app.dns.policy_engine import DNSPolicyEngine
from app.dns.service import DNSSecurityService


@pytest.mark.asyncio
async def test_domain_normalization_and_shannon_entropy():
    """Verifies domain normalization, FQDN decomposition, Shannon entropy, and IDN detection."""
    # 1. Normalization & Trailing dot removal
    raw_1 = "   API.Stripe.COM.   "
    norm_1 = DomainNormalizer.normalize_domain(raw_1)
    assert norm_1 == "api.stripe.com"

    decomp_1 = DomainNormalizer.decompose_domain(norm_1)
    assert decomp_1["fqdn"] == "api.stripe.com"
    assert decomp_1["registered_domain"] == "stripe.com"
    assert decomp_1["subdomain"] == "api"
    assert decomp_1["tld"] == "com"
    assert decomp_1["is_idn"] is False
    assert decomp_1["entropy"] < 3.2  # Low entropy for English dictionary words

    # 2. Multi-part TLD (.co.uk)
    norm_2 = DomainNormalizer.normalize_domain("Checkout.Service.Internal.CO.UK.")
    decomp_2 = DomainNormalizer.decompose_domain(norm_2)
    assert decomp_2["registered_domain"] == "internal.co.uk"
    assert decomp_2["tld"] == "co.uk"
    assert decomp_2["subdomain"] == "checkout.service"

    # 3. High-entropy random label (DGA / Tunnel candidate)
    random_label = "q8x7z9w2v1k4m6p3"
    entropy_high = DomainNormalizer.calculate_shannon_entropy(random_label)
    assert entropy_high > 3.6  # Random alphanumeric labels exhibit high Shannon entropy

    # 4. IDN / Punycode detection
    idn_domain = "xn--pypal-4ve.com"  # Punycode spoof of paypal
    decomp_idn = DomainNormalizer.decompose_domain(idn_domain)
    assert decomp_idn["is_idn"] is True


@pytest.mark.asyncio
async def test_dga_detection():
    """Verifies statistical and linguistic DGA detection (entropy + consonant clusters + length)."""
    # Case 1: DGA-generated domain (high entropy, high consonant ratio, long label)
    dga_candidate = DomainNormalizer.decompose_domain("xzkqwlpzmcvbnr89.biz")
    is_dga, dga_score, details = DNSThreatDetector.detect_dga(dga_candidate)
    assert is_dga is True
    assert dga_score >= 0.65
    assert "high_entropy" in str(details["factors"])

    # Case 2: Legitimate dictionary business domain
    legit_domain = DomainNormalizer.decompose_domain("dashboard.github.com")
    is_legit_dga, legit_score, _ = DNSThreatDetector.detect_dga(legit_domain)
    assert is_legit_dga is False
    assert legit_score < 0.40


@pytest.mark.asyncio
async def test_dns_tunneling_and_exfiltration_detection():
    """Verifies detection of encoded data tunneling in subdomains and TXT abuse."""
    # Case 1: Long encoded subdomain tunneling (e.g. CobaltStrike/Iodine)
    tunnel_domain = DomainNormalizer.decompose_domain(
        "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d.data.tunnel-server.net"
    )
    is_tunnel, sig_type, details = DNSThreatDetector.detect_tunneling(
        domain_decomp=tunnel_domain,
        query_type="A",
    )
    assert is_tunnel is True
    assert sig_type == "DNS_TUNNEL"
    assert len(details["indicators"]) > 0

    # Case 2: TXT record exfiltration abuse
    clean_domain = DomainNormalizer.decompose_domain("service.internal.corp")
    large_encoded_txt = [
        {"type": "TXT", "rdata": "VGhpcyBpcyBhIHZlcnkgbG9uZyBzdGFnZWQgcGF5bG9hZCBleGZpbHRyYXRpb24gZGF0YSBjaHVuayB1c2VkIHRvIGV4ZmlsdHJhdGUgY3JlZGVudGlhbHMgYW5kIHByaXZhdGUga2V5cw==" * 2}
    ]
    is_txt_tunnel, sig_txt_type, _ = DNSThreatDetector.detect_tunneling(
        domain_decomp=clean_domain,
        query_type="TXT",
        answers=large_encoded_txt,
    )
    assert is_txt_tunnel is True
    assert sig_txt_type == "DNS_EXFILTRATION"


@pytest.mark.asyncio
async def test_dns_beaconing_detection():
    """Verifies periodic query beaconing detection using interval delta variance."""
    now = datetime.now(timezone.utc)
    # Case 1: Programmatic C2 beaconing (constant ~30s interval with minimal jitter)
    beacon_timestamps = [
        now - timedelta(seconds=120),
        now - timedelta(seconds=90),
        now - timedelta(seconds=60),
        now - timedelta(seconds=30),
        now,
    ]
    is_beacon, std_dev, details = DNSThreatDetector.detect_beaconing(beacon_timestamps)
    assert is_beacon is True
    assert std_dev < 1.0
    assert details["sample_count"] == 5

    # Case 2: Human random web browsing (variable intervals)
    random_timestamps = [
        now - timedelta(seconds=540),
        now - timedelta(seconds=410),
        now - timedelta(seconds=120),
        now - timedelta(seconds=15),
        now,
    ]
    is_random_beacon, _, _ = DNSThreatDetector.detect_beaconing(random_timestamps)
    assert is_random_beacon is False


@pytest.mark.asyncio
async def test_step24_threat_intel_correlation_with_dns(db_session: AsyncSession):
    """Verifies that DNS query resolution correlates active threat intelligence from Step 24."""
    service = DNSSecurityService(db_session)

    # 1. Seed Step 24 active threat indicator
    malicious_domain = "beacon-stealer-c2.org"
    indicator = ThreatIndicator(
        indicator_type="DOMAIN",
        value=malicious_domain,
        normalized_value=malicious_domain.lower(),
        title="Cobalt Strike C2 Beacon",
        confidence="HIGH",
        severity="CRITICAL",
        status="ACTIVE",
        threat_types=["c2", "malware"],
    )
    db_session.add(indicator)
    await db_session.commit()

    # 2. Ingest DNS query for that domain
    res = await service.ingest_dns_event({
        "query_name": malicious_domain,
        "query_type": "A",
        "client_identity": "k8s-pod:billing-api-89f",
        "environment": "PRODUCTION",
    })

    assert res["threat_match"] is True
    assert res["domain_reputation"] == "KNOWN_MALICIOUS"
    assert "MALICIOUS_DOMAIN" in res["signals"]


@pytest.mark.asyncio
async def test_dns_policy_enforcement_and_execution_status(db_session: AsyncSession):
    """Verifies Allowlist/Blocklist policy evaluation and Rule 2 execution status tracking."""
    service = DNSSecurityService(db_session)
    project_id = uuid.uuid4()

    # 1. Add Blocklist entry for wildcard malicious domain
    await service.add_list_entry(
        list_type="BLOCKLIST",
        domain_pattern="*.evil-c2.net",
        pattern_type="WILDCARD",
        reason="Known adversary infrastructure",
        created_by="secops-lead",
        project_id=project_id,
        scope="PROJECT",
    )

    # 2. Add Allowlist entry for critical payment gateway
    await service.add_list_entry(
        list_type="ALLOWLIST",
        domain_pattern="api.stripe.com",
        pattern_type="EXACT",
        reason="Corporate payment provider",
        created_by="secops-lead",
        project_id=project_id,
        scope="PROJECT",
    )

    # Test Blocklist query
    block_res = await service.ingest_dns_event(
        {
            "query_name": "agent-payload.evil-c2.net",
            "query_type": "A",
            "client_identity": "agent-worker-01",
            "environment": "PRODUCTION",
        },
        project_id=project_id,
    )
    assert block_res["decision"] == "BLOCK"
    assert block_res["execution_status"] == "REQUESTED"  # Rule 2: Never claim BLOCKED without confirmation

    # Test Allowlist query
    allow_res = await service.ingest_dns_event(
        {
            "query_name": "api.stripe.com",
            "query_type": "A",
            "client_identity": "checkout-workload",
            "environment": "PRODUCTION",
        },
        project_id=project_id,
    )
    assert allow_res["decision"] == "ALLOW"
    assert "allowlist" in allow_res["reason"].lower()


@pytest.mark.asyncio
async def test_escalate_dns_signal_to_soc(db_session: AsyncSession):
    """Verifies that an evidence-backed DNS threat signal can be escalated into a real Step 23 SocAlert."""
    service = DNSSecurityService(db_session)
    project_id = uuid.uuid4()

    # Ingest tunneling event to trigger signal
    ingest_res = await service.ingest_dns_event(
        {
            "query_name": "0123456789abcdef0123456789abcdef.data.exfil-tunnel.com",
            "query_type": "A",
            "client_identity": "agent-analyst-prod",
            "agent_identity": "agent-analyst-prod",
            "environment": "PRODUCTION",
        },
        project_id=project_id,
    )
    assert len(ingest_res["signals"]) > 0

    # Retrieve created signal
    signals = await service.list_signals(project_id=project_id)
    assert len(signals) > 0
    target_signal = signals[0]

    # Escalate to Step 23 SOC
    soc_alert = await service.escalate_signal_to_soc(
        signal_id=target_signal.id,
        analyst_user_id="analyst-alex",
    )
    assert isinstance(soc_alert, SocAlert)
    assert soc_alert.source == "DNS_SECURITY"
    assert "[DNS SECURITY]" in soc_alert.title
    assert soc_alert.project_id == project_id
    assert target_signal.status == "ESCALATED"
    assert target_signal.soc_alert_id == soc_alert.id


@pytest.mark.asyncio
async def test_authentic_dns_overview_metrics(db_session: AsyncSession):
    """Verifies authentic calculation of DNS overview metrics from database records (Rule 1)."""
    service = DNSSecurityService(db_session)

    # Case 1: Unconfigured (0 sources)
    stats_empty = await service.get_overview_statistics()
    assert stats_empty["is_configured"] is False
    assert stats_empty["sources_connected"] == 0
    assert stats_empty["total_dns_events"] == 0
    assert stats_empty["resolver_health"] == "NOT_CONFIGURED"

    # Case 2: Configured with collector and events
    source = await service.register_source(
        name="Production CoreDNS",
        source_type="KUBERNETES",
        provider="COREDNS",
        endpoint="kube-dns:53",
    )
    assert source.status == "CONNECTED"

    # Ingest 2 events
    await service.ingest_dns_event({"query_name": "api.internal.org"})
    await service.ingest_dns_event({"query_name": "dashboard.internal.org"})

    stats_configured = await service.get_overview_statistics()
    assert stats_configured["is_configured"] is True
    assert stats_configured["sources_connected"] == 1
    assert stats_configured["total_dns_events"] == 2
    assert stats_configured["resolver_health"] == "HEALTHY"
