"""
Thing Attack — Models
Step 05 Offensive-Security Execution, Attack Surface, DAST, Pentest & Verification Models.

Rules:
- Real database persistence in PostgreSQL / SQLite
- LLM proposes. Deterministic security systems decide. Runtime evidence proves.
- Distinguish: HYPOTHESIS, SIMULATION, OBSERVED, VERIFIED, FAILED, UNKNOWN, NOT TESTED.
- Full provenance for every node and edge in attack paths.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Float,
    Boolean,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class AttackSurfaceAsset(Base):
    """
    Externally reachable or potentially attackable asset.
    Asset types: Domain, Subdomain, IP, Web Application, API, GraphQL Endpoint,
    Service, Load Balancer, Cloud Asset, Container, Kubernetes Service, External Dependency.
    """
    __tablename__ = "attack_surface_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False, index=True)
    asset_type = Column(String(64), nullable=False, index=True)  # DOMAIN, SUBDOMAIN, IP, WEB_APP, API, GRAPHQL, SERVICE, LOAD_BALANCER, CLOUD_ASSET, CONTAINER, K8S_SERVICE, EXTERNAL_DEPENDENCY
    environment = Column(String(64), nullable=False, default="production", index=True)  # production, staging, development, preview
    exposure = Column(String(64), nullable=False, default="INTERNET", index=True)  # INTERNET, INTERNAL, PARTNER, VPC, ISOLATED
    technology = Column(String(128), nullable=True)  # FastAPI, Node.js, Next.js, NGINX, GraphQL, Python, Go, etc.
    target_url = Column(String(512), nullable=True)
    ip_address = Column(String(64), nullable=True)
    port = Column(Integer, nullable=True)
    
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_tested = Column(DateTime(timezone=True), nullable=True)
    risk_level = Column(String(32), nullable=False, default="UNKNOWN", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, SAFE, UNKNOWN
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, INACTIVE, ARCHIVED, DEPRECATED
    ownership = Column(String(128), nullable=True)  # Team, service owner or department
    
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AttackApiEndpoint(Base):
    """
    Discovered API endpoint with explicit discovery provenance and security test tracking.
    """
    __tablename__ = "attack_api_endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("attack_surface_assets.id"), nullable=True, index=True)
    
    path = Column(String(512), nullable=False, index=True)
    method = Column(String(16), nullable=False, default="GET", index=True)  # GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
    auth_type = Column(String(64), nullable=False, default="NONE", index=True)  # JWT, OAUTH2, API_KEY, MUTUAL_TLS, NONE, SESSION, BASIC
    discovery_source = Column(String(64), nullable=False, default="OPENAPI", index=True)  # OPENAPI, TRAFFIC, GATEWAY, REPOSITORY, RUNTIME_TELEMETRY, CRAWLER, MANUAL, CLOUD_INTEGRATION
    api_category = Column(String(64), nullable=False, default="REST")  # REST, GRAPHQL, GRPC, WEBSOCKET, WEBHOOK
    
    parameters = Column(JSON, default=list)  # Query, path, and header parameters
    request_schema = Column(JSON, default=dict)
    response_schema = Column(JSON, default=dict)
    data_access = Column(JSON, default=list)  # Types of data accessed (PII, Financial, Internal, Public)
    dependencies = Column(JSON, default=list)  # Upstream / downstream microservices
    
    risk_level = Column(String(32), nullable=False, default="UNKNOWN", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, SAFE, UNKNOWN
    test_status = Column(String(32), nullable=False, default="NOT_TESTED", index=True)  # NOT_TESTED, TESTING, VERIFIED_SAFE, FINDING_DETECTED, EXPLOITABLE, BLOCKED, INCONCLUSIVE
    security_checks = Column(JSON, default=dict)  # State of checks: BOLA, IDOR, SSRF, injection, auth_bypass, rate_limit, etc.
    
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_tested = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackDiscoveryRun(Base):
    """
    Automated or manual API & service discovery job.
    """
    __tablename__ = "attack_discovery_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    source = Column(String(64), nullable=False)  # OPENAPI, REPOSITORY, GATEWAY, RUNTIME_TRAFFIC, CRAWLER
    target = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    endpoints_discovered = Column(Integer, default=0)
    shadow_apis_detected = Column(Integer, default=0)
    zombie_apis_detected = Column(Integer, default=0)
    
    logs = Column(JSON, default=list)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackDastRun(Base):
    """
    Dynamic Application Security Testing (DAST) execution lifecycle.
    """
    __tablename__ = "attack_dast_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    target_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    target_url = Column(String(512), nullable=False)
    environment = Column(String(64), nullable=False, default="production")
    
    status = Column(String(32), nullable=False, default="CREATED", index=True)  # CREATED, QUEUED, RUNNING, DISCOVERING, TESTING, VALIDATING, COMPLETED, FAILED, CANCEL_REQUESTED, CANCELLED
    progress_percentage = Column(Integer, default=0)
    test_profile = Column(String(64), default="OWASP_TOP_10")  # OWASP_TOP_10, API_SECURITY_TOP_10, FULL_AUDIT, LIGHTWEIGHT_PASSIVE
    auth_config = Column(JSON, default=dict)
    scope = Column(JSON, default=dict)
    safety_policy = Column(JSON, default=dict)  # max_rate_limit, destructive_test: false, allowed_paths
    
    endpoints_discovered = Column(Integer, default=0)
    endpoints_tested = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    
    requires_approval = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=True)
    approved_by = Column(String(128), nullable=True)
    
    raw_logs = Column(JSON, default=list)
    error_reason = Column(Text, nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackPentest(Base):
    """
    Controlled Pentest workspace with multi-step scope, rules of engagement, modules, and approvals.
    """
    __tablename__ = "attack_pentests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    environment = Column(String(64), nullable=False, default="production")
    status = Column(String(32), nullable=False, default="DRAFT", index=True)  # DRAFT, SCOPING, PENDING_APPROVAL, APPROVED, RUNNING, COMPLETED, FAILED, CANCELLED
    
    scope = Column(JSON, default=dict)  # allowed_domains, allowed_ips, allowed_endpoints, excluded_targets
    rules_of_engagement = Column(JSON, default=dict)  # allowed_techniques, forbidden_techniques, max_request_rate, max_execution_time, production_restrictions, data_handling_policy, credential_restrictions
    test_modules = Column(JSON, default=list)  # ["SQLI", "SSRF", "BOLA_IDOR", "AUTH_BYPASS", "RATE_LIMIT_ABUSE"]
    
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    findings_count = Column(Integer, default=0)
    attack_paths_count = Column(Integer, default=0)
    executive_summary = Column(Text, nullable=True)
    
    launched_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AttackFindingRecord(Base):
    """
    Offensive security finding with rigorous exploitability separation.
    Severity != Exploitability.
    """
    __tablename__ = "attack_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    target_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("attack_surface_assets.id"), nullable=True, index=True)
    endpoint_id = Column(UUID(as_uuid=True), ForeignKey("attack_api_endpoints.id"), nullable=True, index=True)
    dast_run_id = Column(UUID(as_uuid=True), ForeignKey("attack_dast_runs.id"), nullable=True, index=True)
    pentest_id = Column(UUID(as_uuid=True), ForeignKey("attack_pentests.id"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), nullable=False, default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    exploitability = Column(String(32), nullable=False, default="THEORETICAL", index=True)  # THEORETICAL, DETECTED, TESTABLE, TESTED, EXPLOITABLE, NOT_EXPLOITABLE, INCONCLUSIVE, BLOCKED, NOT_AUTHORIZED
    attack_type = Column(String(64), nullable=False, default="API_VULNERABILITY", index=True)  # SQL_INJECTION, SSRF, BOLA_IDOR, AUTH_BYPASS, PRIVILEGE_ESCALATION, SENSITIVE_DATA_EXPOSURE, RATE_LIMIT_ABUSE, CORS_MISCONFIGURATION
    
    reproduction_steps = Column(Text, nullable=True)
    remediation_guidance = Column(Text, nullable=True)
    
    # Cross-product context links
    related_code = Column(JSON, default=dict)  # repository, file, line, commit_sha
    related_cloud_resource = Column(JSON, default=dict)  # provider, resource_id, arn, service
    related_runtime_event = Column(JSON, default=dict)  # sensor, trace_id, event_time, blocked_by_protect
    
    retest_status = Column(String(32), nullable=False, default="NONE", index=True)  # NONE, RETESTING, VERIFIED_FIXED, STILL_EXPLOITABLE
    verification_evidence_id = Column(UUID(as_uuid=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AttackEvidenceItem(Base):
    """
    Redacted verifiable proof of exploit or defensive enforcement.
    """
    __tablename__ = "attack_evidence_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("attack_findings.id"), nullable=True, index=True)
    dast_run_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    pentest_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    evidence_type = Column(String(64), nullable=False)  # HTTP_INTERACTION, PAYLOAD_EXECUTION, DATA_EXTRACTION, PRIVILEGE_ESCALATION, BLOCKED_BY_PROTECT
    source = Column(String(64), nullable=False)  # DAST_ENGINE, PENTEST_RUNNER, RUNTIME_SENSOR, OPA_GATEWAY
    target_url = Column(String(512), nullable=False)
    
    request_headers = Column(JSON, default=dict)  # Redacted
    request_payload = Column(Text, nullable=True)  # Redacted
    response_status = Column(Integer, nullable=True)
    response_headers = Column(JSON, default=dict)  # Redacted
    response_body_redacted = Column(Text, nullable=True)
    
    trace_id = Column(String(128), nullable=True)
    verification_method = Column(String(128), nullable=True)
    is_redacted = Column(Boolean, default=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackPathGraphRecord(Base):
    """
    Multi-hop attack path chaining with node and edge provenance.
    Provenance: OBSERVED, CONFIGURED, INFERRED, VERIFIED.
    """
    __tablename__ = "attack_path_graphs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    finding_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    risk_score = Column(Float, default=8.5)
    criticality = Column(String(32), default="CRITICAL")
    
    nodes = Column(JSON, nullable=False)  # [{"id": "...", "label": "...", "type": "...", "provenance": "..."}]
    edges = Column(JSON, nullable=False)  # [{"from": "...", "to": "...", "label": "...", "provenance": "..."}]
    target_asset = Column(String(255), nullable=True)
    blast_radius = Column(Text, nullable=True)
    mitre_techniques = Column(JSON, default=list)
    
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackSchedule(Base):
    """
    Automated security scan & test schedules.
    """
    __tablename__ = "attack_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    test_type = Column(String(64), nullable=False)  # DAST, API_DISCOVERY, PENTEST, CONTINUOUS_RECON
    frequency = Column(String(64), nullable=False)  # DAILY, WEEKLY, CRON, DEPLOYMENT_TRIGGERED, NEW_ENDPOINT_TRIGGERED
    cron_expression = Column(String(64), nullable=True)
    target_url = Column(String(512), nullable=True)
    
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    config = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackReport(Base):
    """
    Persisted report generated from real offensive testing & verification data.
    """
    __tablename__ = "attack_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    report_type = Column(String(64), nullable=False)  # PENTEST, DAST, API_SECURITY, ATTACK_SURFACE, ATTACK_PATH, VERIFICATION, EXECUTIVE, COMPLIANCE
    status = Column(String(32), default="READY")  # GENERATING, READY, FAILED
    
    summary = Column(Text, nullable=True)
    metrics = Column(JSON, default=dict)
    file_format = Column(String(16), default="JSON")  # JSON, PDF, HTML, MARKDOWN
    download_url = Column(String(512), nullable=True)
    
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AttackPolicy(Base):
    """
    Deterministic safety policy and rules of engagement guardrails.
    """
    __tablename__ = "attack_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    policy_type = Column(String(64), nullable=False)  # RATE_LIMIT, DESTRUCTIVE_TEST, PRODUCTION_SAFETY, APPROVAL_REQUIREMENT, SCOPE_ENFORCEMENT
    rules = Column(JSON, default=dict)
    is_enforced = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
