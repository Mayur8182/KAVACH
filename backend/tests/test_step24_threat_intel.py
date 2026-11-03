"""
Step 24 Unit & Integration Tests — Threat Intelligence Platform & Integration.

Tests:
1. Canonical Normalization & Raw Digest Integrity (STIX 2.1 & CISA KEV) (Section 6, 8, 15, Rule 10)
2. Indicator Deduplication Across Multiple Feeds & Source Provenance (Section 13, 14)
3. Threat Match Engine — Exact vs Contextual Matching (Section 20-23)
4. Threat Suppression Lifecycle & False Positive Management (Section 45)
5. Threat Intelligence Escalation to Thing SOC (Section 24-25)
6. Authentic Feed Health, Sync Records & Dashboard Metrics (Section 5, 6, 38, Rule 1, 4)
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.threat_intel_models import (
    ThreatIntelligenceSource,
    ThreatFeedSync,
    ThreatIndicator,
    ThreatIndicatorSource,
    ThreatActor,
    ThreatCampaign,
    MalwareFamily,
    ThreatTechnique,
    ThreatMatch,
    ThreatObservation,
    ThreatSuppression,
)
from app.models.soc_models import SocAlert
from app.threat_intel.adapters import ThreatIntelNormalizationEngine
from app.threat_intel.matcher import ThreatMatchEngine
from app.threat_intel.service import ThreatIntelligenceService


@pytest.mark.asyncio
async def test_normalization_stix21_and_raw_digest():
    """Verifies STIX 2.1 Bundle parsing, indicator extraction, and SHA-256 raw preservation."""
    raw_stix_bundle = {
        "type": "bundle",
        "id": "bundle--3d0c41f7-e9a9-4091-a1e9-44585e8d87b3",
        "objects": [
            {
                "type": "indicator",
                "id": "indicator--11111111-2222-3333-4444-555555555555",
                "pattern": "[domain-name:value = 'command-control-beacon.xyz']",
                "pattern_type": "stix",
                "name": "Cobalt Strike C2 Domain",
                "description": "Known C2 domain used in financial sector intrusions",
                "confidence": 85,
                "created": "2026-09-20T10:00:00Z",
                "modified": "2026-09-21T12:00:00Z",
            },
            {
                "type": "threat-actor",
                "id": "threat-actor--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "name": "APT-FIN-99",
                "aliases": ["ShadowFalcon", "FinThief"],
                "description": "State-sponsored cyber espionage group targeting financial institutions",
                "motivation": "financial-gain",
                "confidence": 90,
            },
            {
                "type": "malware",
                "id": "malware--mmmmmmmm-nnnn-oooo-pppp-qqqqqqqqqqqq",
                "name": "BeaconDropper",
                "family": "CobaltStrike",
                "malware_types": ["trojan", "backdoor"],
                "confidence": 80,
            },
            {
                "type": "attack-pattern",
                "id": "attack-pattern--tttttttt-uuuu-vvvv-wwww-xxxxxxxxxxxx",
                "name": "Command and Scripting Interpreter: PowerShell",
                "description": "Adversaries may abuse PowerShell commands and scripts for execution.",
                "external_references": [
                    {
                        "source_name": "mitre-attack",
                        "external_id": "T1059.001",
                        "url": "https://attack.mitre.org/techniques/T1059/001/",
                    }
                ],
            },
            {
                "type": "relationship",
                "id": "relationship--rrrrrrrr-ssss-tttt-uuuu-vvvvvvvvvvvv",
                "relationship_type": "uses",
                "source_ref": "threat-actor--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "target_ref": "malware--mmmmmmmm-nnnn-oooo-pppp-qqqqqqqqqqqq",
            },
        ],
    }

    norm_result = ThreatIntelNormalizationEngine.parse_stix_bundle(raw_stix_bundle)

    assert norm_result["raw_hash"] is not None
    assert len(norm_result["indicators"]) == 1
    indicator = norm_result["indicators"][0]
    assert indicator["indicator_type"] == "DOMAIN"
    assert indicator["value"] == "command-control-beacon.xyz"
    assert indicator["confidence"] == "HIGH"
    assert indicator["raw_data_reference"].startswith("sha256:")

    assert len(norm_result["threat_actors"]) == 1
    actor = norm_result["threat_actors"][0]
    assert actor["name"] == "APT-FIN-99"
    assert "ShadowFalcon" in actor["aliases"]

    assert len(norm_result["malware"]) == 1
    assert norm_result["malware"][0]["name"] == "BeaconDropper"

    assert len(norm_result["techniques"]) == 1
    assert norm_result["techniques"][0]["technique_id"] == "T1059.001"

    assert len(norm_result["relationships"]) == 1
    rel = norm_result["relationships"][0]
    assert rel["relationship_type"] == "USES"


@pytest.mark.asyncio
async def test_normalization_cisa_kev():
    """Verifies CISA Known Exploited Vulnerabilities (KEV) Catalog ingestion and mapping."""
    raw_cisa_catalog = {
        "title": "CISA Known Exploited Vulnerabilities Catalog",
        "catalogVersion": "2026.09.27",
        "dateReleased": "2026-09-27T08:00:00Z",
        "vulnerabilities": [
            {
                "cveID": "CVE-2026-12345",
                "vendorProject": "Apache",
                "product": "Struts",
                "vulnerabilityName": "Remote Code Execution in Apache Struts",
                "dateAdded": "2026-09-25",
                "shortDescription": "Apache Struts contains a remote code execution vulnerability allowing unauthenticated attackers to execute commands.",
                "requiredAction": "Apply updates per vendor instructions.",
                "dueDate": "2026-10-15",
                "knownRansomwareCampaignUse": "Known",
                "notes": "Actively exploited in the wild.",
            }
        ],
    }

    indicators = ThreatIntelNormalizationEngine.parse_cisa_kev(raw_cisa_catalog)

    assert len(indicators) == 1
    indicator = indicators[0]
    assert indicator["indicator_type"] == "CVE"
    assert indicator["value"] == "CVE-2026-12345"
    assert indicator["confidence"] == "HIGH"
    assert indicator["severity"] == "CRITICAL"
    assert indicator["metadata"]["known_ransomware_campaign_use"] == "Known"
    assert indicator["metadata"]["due_date"] == "2026-10-15"
    assert indicator["raw_data_reference"].startswith("sha256:")


@pytest.mark.asyncio
async def test_indicator_deduplication_and_provenance(db_session: AsyncSession):
    """Verifies that multiple feeds reporting the same indicator maintain a single canonical record with multiple provenance sources."""
    service = ThreatIntelligenceService(db_session)

    # 1. Create Source 1 (Feed A)
    src_1 = await service.create_source(
        name="AbuseIPDB Feed",
        source_type="JSON_FEED",
        provider="AbuseIPDB",
        protocol="HTTPS",
        endpoint="https://api.abuseipdb.com/v2/blacklist",
        authentication_type="API_KEY",
        poll_interval_minutes=60,
    )

    # 2. Create Source 2 (Feed B)
    src_2 = await service.create_source(
        name="CISA Network Feed",
        source_type="STIX_TAXII",
        provider="CISA",
        protocol="HTTPS",
        endpoint="https://cisa.gov/feeds/stix",
        authentication_type="NONE",
        poll_interval_minutes=120,
    )

    # 3. Ingest same malicious IP via Feed A
    feed_a_payload = [
        {
            "type": "IPV4",
            "value": "198.51.100.42",
            "title": "SSH Brute Forcer",
            "confidence": "HIGH",
            "severity": "HIGH",
        }
    ]
    sync_1 = await service.sync_source(src_1.id, feed_payload=feed_a_payload)
    assert sync_1.status == "COMPLETED"
    assert sync_1.records_added == 1

    # Verify 1 canonical indicator exists
    indicators_q = await db_session.execute(select(ThreatIndicator).where(ThreatIndicator.value == "198.51.100.42"))
    ind_res = indicators_q.scalars().all()
    assert len(ind_res) == 1
    canonical_id = ind_res[0].id

    # Verify 1 source provenance row exists
    sources_q = await db_session.execute(
        select(ThreatIndicatorSource).where(ThreatIndicatorSource.indicator_id == canonical_id)
    )
    assert len(sources_q.scalars().all()) == 1

    # 4. Ingest same malicious IP via Feed B (STIX bundle format)
    feed_b_payload = {
        "type": "bundle",
        "objects": [
            {
                "type": "indicator",
                "id": "indicator--feed-b-4242",
                "pattern": "[ipv4-addr:value = '198.51.100.42']",
                "name": "C2 Infrastructure",
                "confidence": 95,
            }
        ],
    }
    sync_2 = await service.sync_source(src_2.id, feed_payload=feed_b_payload)
    assert sync_2.status == "COMPLETED"
    assert sync_2.records_updated == 1  # Deduplicated and updated, not duplicated

    # Verify still exactly 1 canonical indicator exists
    indicators_q2 = await db_session.execute(select(ThreatIndicator).where(ThreatIndicator.value == "198.51.100.42"))
    assert len(indicators_q2.scalars().all()) == 1

    # Verify 2 source provenance rows exist for the single canonical indicator
    sources_q2 = await db_session.execute(
        select(ThreatIndicatorSource).where(ThreatIndicatorSource.indicator_id == canonical_id)
    )
    prov_rows = sources_q2.scalars().all()
    assert len(prov_rows) == 2
    source_ids = [p.source_id for p in prov_rows]
    assert src_1.id in source_ids
    assert src_2.id in source_ids


@pytest.mark.asyncio
async def test_threat_match_engine_exact_and_clean(db_session: AsyncSession):
    """Verifies that the Match Engine accurately correlates real observations against threat indicators, distinguishing EXACT from clean."""
    project_id = uuid.uuid4()
    service = ThreatIntelligenceService(db_session)
    matcher = ThreatMatchEngine(db_session)

    # Register source and ingest domain indicator
    source = await service.create_source(
        name="ThreatTrack Intelligence",
        source_type="JSON_FEED",
        provider="ThreatTrack",
        protocol="HTTPS",
        endpoint="https://threattrack.example.com",
    )
    payload = [
        {
            "type": "DOMAIN",
            "value": "malicious-stealer-c2.net",
            "confidence": "HIGH",
            "severity": "CRITICAL",
        },
        {
            "type": "IPV4",
            "value": "203.0.113.195",
            "confidence": "HIGH",
            "severity": "HIGH",
        }
    ]
    await service.sync_source(source.id, feed_payload=payload)

    # 1. Exact match test: Observed domain matches indicator exactly
    match_tuple = await matcher.correlate_observation(
        project_id=project_id,
        observation_type="DNS_QUERY",
        observed_value="malicious-stealer-c2.net",
        observed_entity_id="k8s-pod:checkout-service-89f4",
        observed_entity_type="KUBERNETES_POD",
        environment="PRODUCTION",
        evidence_reference="EV-DNS-001",
        context={"destination_port": 53, "resolver": "10.96.0.10"},
    )
    assert match_tuple is not None
    match, observation = match_tuple
    assert match.match_type == "EXACT"
    assert match.confidence == "HIGH"
    assert match.severity == "CRITICAL"
    assert match.observed_entity.get("id") == "k8s-pod:checkout-service-89f4"
    assert observation.observation_type == "DNS_QUERY"

    # 2. Clean test: Observed benign domain does not match
    clean_tuple = await matcher.correlate_observation(
        project_id=project_id,
        observation_type="DNS_QUERY",
        observed_value="api.stripe.com",
        observed_entity_id="k8s-pod:checkout-service-89f4",
        observed_entity_type="KUBERNETES_POD",
    )
    assert clean_tuple is None


@pytest.mark.asyncio
async def test_threat_suppression_lifecycle(db_session: AsyncSession):
    """Verifies that an authorized analyst can suppress false-positive indicators with evidence and scope."""
    project_id = uuid.uuid4()
    service = ThreatIntelligenceService(db_session)
    matcher = ThreatMatchEngine(db_session)

    # Ingest IP indicator
    source = await service.create_source(
        name="Generic Blocklist",
        source_type="JSON_FEED",
        provider="BlocklistCorp",
        protocol="HTTPS",
        endpoint="https://blocklist.example.com",
    )
    payload = [
        {
            "type": "IPV4",
            "value": "192.0.2.100",
            "confidence": "HIGH",
            "severity": "HIGH",
        }
    ]
    await service.sync_source(source.id, feed_payload=payload)

    # Before suppression: observation triggers match
    match_tuple_before = await matcher.correlate_observation(
        project_id=project_id,
        observation_type="NETWORK_OUTBOUND",
        observed_value="192.0.2.100",
        observed_entity_id="vpc-nat-gateway-prod",
        environment="PRODUCTION",
    )
    assert match_tuple_before is not None
    match_before, _ = match_tuple_before

    # Apply suppression (e.g., internal partner or load balancer IP)
    suppression = await service.suppress_indicator(
        indicator_id=match_before.indicator_id,
        reason="Corporate partner proxy false positive",
        suppressed_by="secops-lead",
        project_id=project_id,
        duration_days=30,
        scope="GLOBAL",
    )
    assert suppression.is_active is True

    # After suppression: observation does not produce active match
    match_tuple_after = await matcher.correlate_observation(
        project_id=project_id,
        observation_type="NETWORK_OUTBOUND",
        observed_value="192.0.2.100",
        observed_entity_id="vpc-nat-gateway-prod",
        environment="PRODUCTION",
    )
    assert match_tuple_after is None


@pytest.mark.asyncio
async def test_escalate_threat_match_to_soc(db_session: AsyncSession):
    """Verifies that a high-confidence threat match can be escalated into a real Step 23 SocAlert."""
    project_id = uuid.uuid4()
    service = ThreatIntelligenceService(db_session)
    matcher = ThreatMatchEngine(db_session)

    # Register and ingest indicator
    source = await service.create_source(
        name="AlienVault OTX Feed",
        source_type="JSON_FEED",
        provider="AlienVault",
        protocol="HTTPS",
        endpoint="https://otx.alienvault.com",
    )
    payload = [
        {
            "type": "IPV4",
            "value": "203.0.113.88",
            "confidence": "HIGH",
            "severity": "CRITICAL",
        }
    ]
    await service.sync_source(source.id, feed_payload=payload)

    # Observe connection to malicious IP
    match_tuple = await matcher.correlate_observation(
        project_id=project_id,
        observation_type="NETWORK_OUTBOUND",
        observed_value="203.0.113.88",
        observed_entity_id="agent-worker-prod-02",
        observed_entity_type="AGENT",
        environment="PRODUCTION",
        evidence_reference="EV-NET-9912",
        context={"bytes_sent": 54200, "agent_id": "agent-worker-prod-02"},
    )
    assert match_tuple is not None
    match, _ = match_tuple

    # Escalate match to SOC alert
    alert = await service.escalate_match_to_soc(
        match_id=match.id,
        analyst_user_id="analyst-alex",
    )
    assert alert is not None
    assert isinstance(alert, SocAlert)
    assert alert.severity == "CRITICAL"
    assert "Threat Match" in alert.title
    assert alert.status == "NEW"
    assert alert.source == "THREAT_INTELLIGENCE"
    assert alert.project_id == project_id

    # Verify match record status was updated to ESCALATED_TO_SOC
    match_detail = await service.get_match(match.id)
    assert match_detail["match"].status == "ESCALATED_TO_SOC"
    assert match_detail["match"].alert_id == alert.id


@pytest.mark.asyncio
async def test_threat_intel_overview_metrics(db_session: AsyncSession):
    """Verifies authentic calculation of Threat Intelligence overview metrics from real database records."""
    service = ThreatIntelligenceService(db_session)

    # Case 1: Unconfigured (0 sources)
    stats_empty = await service.get_overview_statistics()
    assert stats_empty["feed_health"] == "NOT_CONFIGURED"
    assert stats_empty["active_sources"] == 0
    assert stats_empty["total_indicators"] == 0
    assert stats_empty["threat_matches"] == 0

    # Case 2: Configured with 1 active source and 2 indicators
    source = await service.create_source(
        name="CISA KEV Feed",
        source_type="CISA_KEV",
        provider="CISA",
        protocol="HTTPS",
        endpoint="https://cisa.gov/catalog.json",
    )
    payload = {
        "vulnerabilities": [
            {
                "cveID": "CVE-2026-9001",
                "vendorProject": "Linux",
                "product": "Kernel",
                "vulnerabilityName": "Privilege Escalation",
                "dateAdded": "2026-09-20",
                "knownRansomwareCampaignUse": "Known",
            },
            {
                "cveID": "CVE-2026-9002",
                "vendorProject": "OpenSSL",
                "product": "Library",
                "vulnerabilityName": "Buffer Overflow",
                "dateAdded": "2026-09-22",
                "knownRansomwareCampaignUse": "Unknown",
            }
        ]
    }
    await service.sync_source(source.id, feed_payload=payload)

    stats_populated = await service.get_overview_statistics()
    assert stats_populated["feed_health"] == "HEALTHY"
    assert stats_populated["active_sources"] == 1
    assert stats_populated["total_indicators"] == 2
    assert stats_populated["known_exploited_vulnerabilities"] == 2
