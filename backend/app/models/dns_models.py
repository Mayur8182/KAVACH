"""
Step 25 DNS Security & DNS Threat Protection Models.

Implements all DNS security entities per Step 25 specifications:
- dns_data_sources
- dns_events
- domains
- dns_policies
- dns_list_entries
- dns_decisions
- dns_signals
- dns_baselines

Enforces Non-Negotiable Rules:
- Rule 1: No fake DNS events.
- Rule 2: No fake block (status: REQUESTED, EXECUTING, BLOCKED, FAILED, UNKNOWN).
- Rule 3: DNS Intelligence != Compromise.
- Rule 4: DNS Anomaly != Attack.
- Rule 5: Policy is authoritative.
- Rule 6: Real identity association.
- Rule 8: Tenant isolation.
- Rule 9: Cryptographic raw payload preservation with SHA-256.
- Rule 11: UNKNOWN is a valid state.
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


class DNSDataSource(Base):
    """Registry of DNS telemetry sources (Cloud DNS, CoreDNS, Resolvers, Agents)."""
    __tablename__ = "dns_data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    source_type = Column(String(64), nullable=False)  # CLOUD_DNS, RESOLVER, NETWORK_SENSOR, ENDPOINT_AGENT, KUBERNETES, PROXY, FIREWALL, SERVICE_MESH
    provider = Column(String(64), nullable=False)  # AWS_ROUTE53, COREDNS, CLOUDFLARE, BIND, INFOSLOX, ENVOY, GENERIC
    endpoint = Column(String(512), nullable=False)
    authentication_type = Column(String(64), nullable=False, default="NONE")  # API_KEY, IAM_ROLE, TLS_CERT, BEARER_TOKEN, NONE
    configuration = Column(JSON, default=dict)
    enabled = Column(Boolean, default=True, nullable=False)
    status = Column(String(32), nullable=False, default="NOT_CONFIGURED")  # NOT_CONFIGURED, CONNECTING, CONNECTED, COLLECTING, DEGRADED, AUTHENTICATION_FAILED, UNAVAILABLE, DISABLED
    status_reason = Column(Text, nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    last_success = Column(DateTime(timezone=True), nullable=True)
    last_failure = Column(DateTime(timezone=True), nullable=True)
    events_collected = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_data_sources_status", "status"),
        Index("ix_dns_data_sources_type", "source_type"),
    )


class DNSEvent(Base):
    """Canonical normalized DNS event record."""
    __tablename__ = "dns_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    query_name = Column(String(512), nullable=False)  # Raw queried name e.g., "Api.Company.COM."
    normalized_query = Column(String(512), nullable=False, index=True)  # Lowercase without trailing dot
    query_type = Column(String(16), nullable=False, default="A")  # A, AAAA, CNAME, MX, TXT, NS, PTR, SRV, SOA, CAA, ANY
    response_code = Column(String(16), nullable=False, default="NOERROR")  # NOERROR, NXDOMAIN, SERVFAIL, REFUSED, FORMERR, NOTIMP, OTHER
    answers = Column(JSON, default=list)  # [{"type": "A", "rdata": "198.51.100.4", "ttl": 300}]
    resolver = Column(String(255), nullable=True)
    resolver_ip = Column(String(64), nullable=True)
    protocol = Column(String(16), nullable=False, default="UDP")  # UDP, TCP, DOH, DOT
    source_type = Column(String(64), nullable=False, default="RESOLVER")
    client_ip = Column(String(64), nullable=True)
    destination_ip = Column(String(64), nullable=True)
    client_identity = Column(String(255), nullable=True)
    user_identity = Column(String(255), nullable=True)
    agent_identity = Column(String(255), nullable=True)  # AI agent ID if originated from an agent
    workload_identity = Column(String(255), nullable=True)
    container_id = Column(String(128), nullable=True)
    pod_id = Column(String(128), nullable=True)
    namespace = Column(String(128), nullable=True)
    cloud_resource_id = Column(String(255), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    environment = Column(String(64), nullable=False, default="PRODUCTION")  # PRODUCTION, STAGING, DEVELOPMENT
    duration_ms = Column(Float, nullable=True)
    raw_event_reference = Column(String(255), nullable=False)  # sha256:<digest>
    correlation_id = Column(String(128), nullable=True)
    threat_match_id = Column(UUID(as_uuid=True), nullable=True)
    decision_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_events_norm_query_time", "normalized_query", "timestamp"),
        Index("ix_dns_events_agent_time", "agent_identity", "timestamp"),
        Index("ix_dns_events_proj_rcode", "project_id", "response_code"),
    )


class Domain(Base):
    """Canonical domain object tracking FQDN, registered domain, and reputation."""
    __tablename__ = "domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fqdn = Column(String(512), nullable=False, unique=True, index=True)  # e.g., "checkout.v1.api.company.com"
    registered_domain = Column(String(255), nullable=False, index=True)  # e.g., "company.com"
    subdomain = Column(String(255), nullable=True)  # e.g., "checkout.v1.api"
    tld = Column(String(64), nullable=False)  # e.g., "com"
    punycode = Column(String(512), nullable=True)
    is_idn = Column(Boolean, default=False, nullable=False)
    idn_classification = Column(String(32), nullable=False, default="NORMAL")  # NORMAL, SUSPICIOUS_IDN, UNKNOWN
    reputation = Column(String(32), nullable=False, default="UNKNOWN")  # KNOWN_MALICIOUS, SUSPICIOUS, KNOWN_BENIGN, UNKNOWN
    classification = Column(String(64), nullable=False, default="UNCLASSIFIED")  # C2, MALWARE, PHISHING, EXFILTRATION, DGA, LEGITIMATE, UNCLASSIFIED
    entropy = Column(Float, nullable=True)  # Shannon entropy of the domain label
    first_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    total_queries = Column(Integer, default=1, nullable=False)
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, BLOCKED, SINKHOLED, SUPPRESSED, EXPIRED
    source = Column(String(128), nullable=False, default="TELEMETRY")  # TELEMETRY, THREAT_FEED, POLICY, MANUAL
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_domains_reg_domain", "registered_domain"),
        Index("ix_domains_reputation", "reputation"),
        Index("ix_domains_classification", "classification"),
    )


class DNSPolicy(Base):
    """Scoped and versioned DNS security policies."""
    __tablename__ = "dns_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    version = Column(String(32), nullable=False, default="1.0.0")
    scope = Column(String(64), nullable=False, default="GLOBAL")  # GLOBAL, ORGANIZATION, PROJECT, ENVIRONMENT, NETWORK, WORKLOAD, AGENT, USER
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    priority = Column(Integer, nullable=False, default=100)
    conditions = Column(JSON, nullable=False, default=dict)  # AST conditions e.g. {"threat_classification": "KNOWN_MALICIOUS", "environment": "PRODUCTION"}
    action = Column(String(32), nullable=False, default="BLOCK")  # ALLOW, WARN, BLOCK, LOG, SINKHOLE, REQUIRE_APPROVAL
    sinkhole_ip = Column(String(64), nullable=True)  # IP address returned when sinkholing
    enabled = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(128), nullable=False, default="SYSTEM")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_policies_scope_priority", "scope", "priority"),
    )


class DNSListEntry(Base):
    """Explicit Allowlist, Blocklist, and Watchlist entries."""
    __tablename__ = "dns_list_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    list_type = Column(String(32), nullable=False)  # ALLOWLIST, BLOCKLIST, WATCHLIST
    domain_pattern = Column(String(512), nullable=False)  # e.g., "api.stripe.com", "*.evil-c2.net"
    pattern_type = Column(String(32), nullable=False, default="EXACT")  # EXACT, WILDCARD, REGEX, CIDR
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    scope = Column(String(64), nullable=False, default="PROJECT")  # GLOBAL, PROJECT
    reason = Column(Text, nullable=False)
    created_by = Column(String(128), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    evidence_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_list_entries_type_pat", "list_type", "domain_pattern"),
        Index("ix_dns_list_entries_active", "is_active", "expires_at"),
    )


class DNSDecision(Base):
    """Post-decision enforcement evidence and audit trail."""
    __tablename__ = "dns_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dns_event_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("dns_policies.id", ondelete="SET NULL"), nullable=True)
    identity = Column(String(255), nullable=False)
    domain = Column(String(512), nullable=False)
    action = Column(String(32), nullable=False)  # ALLOW, WARN, BLOCK, LOG, SINKHOLE, REQUIRE_APPROVAL
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)  # {threat_match_id, rule_id, indicators, entropy}
    execution_status = Column(String(32), nullable=False, default="REQUESTED")  # REQUESTED, EXECUTING, BLOCKED, FAILED, UNKNOWN (Rule 2)
    enforced_by = Column(String(64), nullable=False, default="DNS_GATEWAY")  # DNS_GATEWAY, RESOLVER_POLICY, KUBE_NETWORK_POLICY, SINKHOLE
    post_enforcement_verified = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_decisions_action_status", "action", "execution_status"),
        Index("ix_dns_decisions_domain", "domain"),
    )


class DNSSignal(Base):
    """Deterministic security detection signals (Tunneling, DGA, Exfiltration, Beaconing)."""
    __tablename__ = "dns_signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signal_key = Column(String(64), nullable=False, unique=True, index=True)  # SIG-DNS-YYYYMM-XXXX
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    alert_type = Column(String(64), nullable=False)  # MALICIOUS_DOMAIN, C2_DOMAIN, DNS_TUNNEL, DNS_EXFILTRATION, DGA_SUSPECTED, DNS_BEACONING, NXDOMAIN_ANOMALY, DNS_BEHAVIOR_CHANGE, UNAUTHORIZED_RESOLVER, DNS_POLICY_VIOLATION
    severity = Column(String(32), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence = Column(String(32), nullable=False, default="HIGH")  # HIGH, MEDIUM, LOW, UNKNOWN
    domain = Column(String(512), nullable=False)
    entity_id = Column(String(255), nullable=False)  # Workload ID, Agent ID, Pod ID
    entity_type = Column(String(64), nullable=False, default="WORKLOAD")  # AGENT, WORKLOAD, POD, USER, IP
    details = Column(JSON, default=dict)  # Detailed metrics: entropy, label length, query count, interval variance
    raw_event_ids = Column(JSON, default=list)  # Supporting DNSEvent IDs
    soc_alert_id = Column(UUID(as_uuid=True), nullable=True)  # Link to Step 23 SocAlert
    status = Column(String(32), nullable=False, default="NEW")  # NEW, INVESTIGATING, ESCALATED, RESOLVED, FALSE_POSITIVE
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_signals_type_sev", "alert_type", "severity"),
        Index("ix_dns_signals_entity", "entity_type", "entity_id"),
    )


class DNSBaseline(Base):
    """Behavioral baseline for workloads and agents."""
    __tablename__ = "dns_baselines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(String(255), nullable=False, index=True)  # Workload or Agent ID
    entity_type = Column(String(64), nullable=False, default="WORKLOAD")  # WORKLOAD, AGENT, NAMESPACE, PROJECT
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    known_domains = Column(JSON, default=list)  # Set of established benign FQDNs / registered domains
    avg_qps = Column(Float, nullable=False, default=0.0)
    nxdomain_ratio = Column(Float, nullable=False, default=0.0)
    last_calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_dns_baselines_unique", "entity_id", "entity_type", unique=True),
    )
