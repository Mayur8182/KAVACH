"""
Step 24 Threat Intelligence Platform Models.

Implements all canonical threat intelligence entities per Section 16:
- threat_intelligence_sources
- threat_feed_syncs
- threat_intelligence_objects
- threat_indicators
- threat_indicator_sources
- threat_actors
- threat_campaigns
- malware_families
- threat_techniques
- threat_reports
- threat_relationships
- threat_references
- threat_tags
- threat_matches
- threat_observations
- threat_suppressions

Rules:
- Rule 1: No fake threat intelligence.
- Rule 2: Intelligence != Compromise.
- Rule 3: Intelligence != Blocklist.
- Rule 4: Observation required for environment claims.
- Rule 5: Source provenance preserved.
- Rule 6: Freshness & expiration tracking.
- Rule 10: Preserve raw source payloads with SHA-256 digests.
- Rule 11: Multi-tenant / project isolation.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Boolean,
    Text,
    Float,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ThreatIntelligenceSource(Base):
    """External or internal threat intelligence feed registry."""
    __tablename__ = "threat_intelligence_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    source_type = Column(String(64), nullable=False)  # STIX_TAXII, REST_API, JSON, CSV, ADVISORY, INTERNAL
    provider = Column(String(255), nullable=False)  # e.g., CISA, AlienVault_OTX, MISP, AbuseIPDB, NVD
    protocol = Column(String(32), nullable=False, default="HTTPS")
    endpoint = Column(String(1024), nullable=False)
    authentication_type = Column(String(64), nullable=False, default="NONE")  # API_KEY, BEARER_TOKEN, BASIC, CERTIFICATE, NONE
    configuration = Column(JSON, default=dict)
    enabled = Column(Boolean, default=True, nullable=False)
    poll_interval_minutes = Column(Integer, default=60, nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_failure_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(64), nullable=False, default="CONFIGURED")  # CONFIGURED, CONNECTING, CONNECTED, SYNCING, SYNCED, DEGRADED, AUTHENTICATION_FAILED, RATE_LIMITED, UNAVAILABLE, DISABLED
    status_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatFeedSync(Base):
    """Execution audit of feed synchronization jobs."""
    __tablename__ = "threat_feed_syncs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("threat_intelligence_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), nullable=False, default="RUNNING")  # RUNNING, COMPLETED, FAILED, CANCELLED
    records_received = Column(Integer, default=0, nullable=False)
    records_valid = Column(Integer, default=0, nullable=False)
    records_invalid = Column(Integer, default=0, nullable=False)
    records_added = Column(Integer, default=0, nullable=False)
    records_updated = Column(Integer, default=0, nullable=False)
    records_skipped = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    raw_payload_hash = Column(String(128), nullable=True)


class ThreatIntelligenceObject(Base):
    """Generic normalized STIX-aligned intelligence entity."""
    __tablename__ = "threat_intelligence_objects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_type = Column(String(64), nullable=False, index=True)  # INDICATOR, THREAT_ACTOR, MALWARE, CAMPAIGN, VULNERABILITY, TECHNIQUE, REPORT, INFRASTRUCTURE
    source_id = Column(UUID(as_uuid=True), ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)  # External ID from provider / STIX ID
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(String(32), nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW, UNKNOWN
    severity = Column(String(32), nullable=False, default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    tags = Column(JSON, default=list)
    labels = Column(JSON, default=list)
    references = Column(JSON, default=list)
    raw_data_reference = Column(String(255), nullable=True)  # sha256 reference or object storage pointer
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatIndicator(Base):
    """Canonical threat indicators for rapid correlation and matching."""
    __tablename__ = "threat_indicators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_type = Column(String(64), nullable=False, index=True)  # IPV4, IPV6, DOMAIN, URL, HOSTNAME, FILE_HASH, EMAIL, CERTIFICATE, PACKAGE, REGISTRY, CVE
    value = Column(String(1024), nullable=False, index=True)  # e.g., 198.51.100.1, evil-c2.com, sha256 hash
    normalized_value = Column(String(1024), nullable=False, index=True)  # lowercased / trimmed
    title = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    confidence = Column(String(32), nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW, UNKNOWN
    severity = Column(String(32), nullable=False, default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status = Column(String(32), nullable=False, default="ACTIVE")  # NEW, ACTIVE, EXPIRED, REVOKED, FALSE_POSITIVE, SUPPRESSED, UNKNOWN
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    source_count = Column(Integer, default=1, nullable=False)
    threat_types = Column(JSON, default=list)  # ["botnet", "c2", "ransomware", "scanner"]
    raw_data_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_threat_indicators_type_val", "indicator_type", "normalized_value", unique=True),
        Index("ix_threat_indicators_status_until", "status", "valid_until"),
    )


class ThreatIndicatorSource(Base):
    """Provenance tracking for multiple feeds asserting the same indicator."""
    __tablename__ = "threat_indicator_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("threat_intelligence_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    external_reference = Column(String(255), nullable=True)
    reported_confidence = Column(String(32), nullable=True)
    reported_severity = Column(String(32), nullable=True)
    first_reported = Column(DateTime(timezone=True), nullable=True)
    last_reported = Column(DateTime(timezone=True), nullable=True)
    raw_payload = Column(JSON, default=dict)
    ingested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_indicator_sources_unique", "indicator_id", "source_id", unique=True),
    )


class ThreatActor(Base):
    """Attributed or tracked threat actors and adversary groups."""
    __tablename__ = "threat_actors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)  # e.g., APT29, Lazarus Group
    aliases = Column(JSON, default=list)  # ["Cozy Bear", "NOBELIUM"]
    description = Column(Text, nullable=True)
    country = Column(String(128), nullable=True)
    motivation = Column(String(128), nullable=True)  # ESPIONAGE, FINANCIAL, SABOTAGE, HACKTIVISM
    targeting = Column(JSON, default=list)  # Sectors or regions targeted
    confidence = Column(String(32), nullable=False, default="MEDIUM")
    references = Column(JSON, default=list)
    source_id = Column(UUID(as_uuid=True), ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True)
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatCampaign(Base):
    """Coordinated threat activities and campaigns."""
    __tablename__ = "threat_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("threat_actors.id", ondelete="SET NULL"), nullable=True, index=True)
    objective = Column(String(255), nullable=True)
    targeting = Column(JSON, default=list)
    techniques = Column(JSON, default=list)
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(String(32), nullable=False, default="MEDIUM")
    references = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class MalwareFamily(Base):
    """Identified malware families, variants, and toolkits."""
    __tablename__ = "malware_families"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    aliases = Column(JSON, default=list)
    malware_type = Column(String(64), nullable=True)  # RANSOMWARE, TROJAN, STEALER, ROOTKIT, WORM
    description = Column(Text, nullable=True)
    file_hashes = Column(JSON, default=list)
    known_domains = Column(JSON, default=list)
    known_ips = Column(JSON, default=list)
    techniques = Column(JSON, default=list)
    references = Column(JSON, default=list)
    confidence = Column(String(32), nullable=False, default="MEDIUM")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatTechnique(Base):
    """MITRE ATT&CK techniques associated with threat intelligence."""
    __tablename__ = "threat_techniques"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technique_id = Column(String(32), nullable=False, unique=True, index=True)  # e.g., T1059.001
    name = Column(String(255), nullable=False)
    tactic = Column(String(64), nullable=False, index=True)  # e.g., Execution, Persistence, Defense Evasion
    description = Column(Text, nullable=True)
    url = Column(String(512), nullable=True)
    detection_guidance = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatReport(Base):
    """Synthesized threat intelligence reports and advisories."""
    __tablename__ = "threat_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(512), nullable=False)
    summary = Column(Text, nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    report_url = Column(String(1024), nullable=True)
    extracted_indicators = Column(JSON, default=list)
    extracted_actors = Column(JSON, default=list)
    extracted_techniques = Column(JSON, default=list)
    raw_data_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatRelationship(Base):
    """Explicit relationships connecting threat entities and graph edges."""
    __tablename__ = "threat_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type = Column(String(64), nullable=False)  # THREAT_ACTOR, CAMPAIGN, MALWARE, INDICATOR, TECHNIQUE
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    relationship_type = Column(String(64), nullable=False)  # USES, TARGETS, COMMUNICATES_WITH, RESOLVES_TO, ATTRIBUTED_TO, EXPLOITS
    target_type = Column(String(64), nullable=False)  # MALWARE, CAMPAIGN, DOMAIN, IP, TECHNIQUE, VULNERABILITY
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    confidence = Column(String(32), nullable=False, default="MEDIUM")
    source_provenance = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatReference(Base):
    """External publications, CVE advisories, and research links."""
    __tablename__ = "threat_references"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String(64), nullable=False)  # INDICATOR, ACTOR, CAMPAIGN, MALWARE
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatTag(Base):
    """Standardized threat tagging and labeling taxonomy."""
    __tablename__ = "threat_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(128), nullable=False, unique=True, index=True)
    category = Column(String(64), nullable=False, default="GENERAL")  # ACTOR, MALWARE, CAMPAIGN, SECTOR, TTP
    description = Column(Text, nullable=True)


class ThreatMatch(Base):
    """Evidence-backed match between an observed entity in Thing and threat intelligence."""
    __tablename__ = "threat_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True)
    match_key = Column(String(64), nullable=False, unique=True, index=True)  # TMT-YYYYMM-XXXX
    match_type = Column(String(64), nullable=False)  # EXACT, DOMAIN, HASH, NETWORK, PACKAGE, CVE, BEHAVIORAL, RELATIONSHIP
    observed_entity = Column(JSON, nullable=False)  # {"type": "WORKLOAD", "id": "payment-api", "ip": "203.0.113.10"}
    observation_id = Column(String(128), nullable=True)  # Event ID or Evidence ID of the observation
    environment = Column(String(64), nullable=False, default="PRODUCTION")
    confidence = Column(String(32), nullable=False, default="HIGH")  # HIGH, MEDIUM, LOW, UNKNOWN
    severity = Column(String(32), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status = Column(String(32), nullable=False, default="NEW")  # NEW, CONFIRMED, INVESTIGATING, ESCALATED_TO_SOC, FALSE_POSITIVE, SUPPRESSED, DISMISSED
    first_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    evidence_id = Column(String(128), nullable=True)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("soc_alerts.id", ondelete="SET NULL"), nullable=True, index=True)
    incident_id = Column(UUID(as_uuid=True), nullable=True)  # Linked Incident ID if escalated
    details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatObservation(Base):
    """Documented runtime observations of threat indicators in customer telemetry."""
    __tablename__ = "threat_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_type = Column(String(64), nullable=False)  # NETWORK_OUTBOUND, NETWORK_INBOUND, DNS_QUERY, CONTAINER_HASH, PACKAGE_DEP, API_CALL
    observed_value = Column(String(1024), nullable=False)
    observed_entity_id = Column(String(255), nullable=False)
    observed_entity_type = Column(String(64), nullable=False)  # WORKLOAD, AGENT, CONTAINER, POD, SERVICE
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    evidence_reference = Column(String(255), nullable=True)  # Event ID or raw log reference
    context = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ThreatSuppression(Base):
    """Scoped false positive or legitimate business service suppression rule."""
    __tablename__ = "threat_suppressions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    scope = Column(String(64), nullable=False, default="PROJECT")  # GLOBAL, PROJECT, ENVIRONMENT
    reason = Column(Text, nullable=False)
    suppressed_by = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
