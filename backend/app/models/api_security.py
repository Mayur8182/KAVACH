"""
Kavach API Security — Authoritative Database Models
PostgreSQL persistence for API targets, discovered endpoints, security test plans,
scan executions, findings, attack paths, and reports.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class ApiTarget(Base):
    """Connected API specification or service target."""
    __tablename__ = "api_targets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(64), default="1.0")
    base_url = Column(String(512), nullable=False)
    environment = Column(String(64), default="PRODUCTION")  # PRODUCTION, STAGING, DEVELOPMENT
    spec_type = Column(String(64), default="OPENAPI")       # OPENAPI, POSTMAN, URL, GITHUB, CODE_SCAN
    spec_content = Column(Text, nullable=True)             # Raw OpenAPI/Swagger/Postman JSON or YAML
    endpoints_count = Column(Integer, default=0)
    status = Column(String(64), default="CONNECTED")        # CONNECTED, ANALYZED, SYNCING, DISCONNECTED
    auth_type = Column(String(64), default="NONE")         # OAUTH2, BEARER, API_KEY, BASIC, NONE
    auth_config = Column(JSON, default=dict)               # Secure non-secret tokens, header names, token URLs
    last_analyzed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    endpoints = relationship("ApiEndpoint", back_populates="api_target", cascade="all, delete-orphan")
    test_plans = relationship("ApiTestPlan", back_populates="api_target", cascade="all, delete-orphan")
    scans = relationship("ApiSecurityScan", back_populates="api_target", cascade="all, delete-orphan")
    findings = relationship("ApiFinding", back_populates="api_target", cascade="all, delete-orphan")


class ApiEndpoint(Base):
    """Individual API endpoint discovered from specification, code AST, or runtime."""
    __tablename__ = "api_endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(String(16), nullable=False)            # GET, POST, PUT, PATCH, DELETE, OPTIONS, GRAPHQL, WS
    path = Column(String(1024), nullable=False)           # /api/v1/orders
    category = Column(String(128), default="General")     # Orders, Auth, Payments, Users, Catalog
    auth_required = Column(Boolean, default=True)
    risk_level = Column(String(32), default="LOW")         # CRITICAL, HIGH, MEDIUM, LOW
    parameters = Column(JSON, default=list)               # Query, path, and header parameter definitions
    request_schema = Column(JSON, default=dict)
    response_schema = Column(JSON, default=dict)
    discovery_source = Column(String(64), default="SPEC_IMPORT")  # SPEC_IMPORT, CODE_DISCOVERED, RUNTIME_DISCOVERED
    code_file_path = Column(String(512), nullable=True)   # src/controllers/orderController.ts:42
    coverage_status = Column(String(64), default="DISCOVERED")    # DISCOVERED, ELIGIBLE, PLANNED, EXECUTED, VERIFIED
    last_scanned_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    api_target = relationship("ApiTarget", back_populates="endpoints")
    findings = relationship("ApiFinding", back_populates="endpoint", cascade="all, delete-orphan")


class ApiTestPlan(Base):
    """Validated security test configuration and selected test categories."""
    __tablename__ = "api_test_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), default="Automated Security Test Plan")
    selected_categories = Column(JSON, default=list)      # ["Authentication", "Authorization", "Rate Limiting", "Injection", "Data Exposure"]
    configurations = Column(JSON, default=dict)           # Auth settings, headers, rate limits, test identities
    schedule = Column(String(128), nullable=True)         # Cron expression or None
    status = Column(String(64), default="READY")          # DRAFT, READY, ACTIVE
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    api_target = relationship("ApiTarget", back_populates="test_plans")
    scans = relationship("ApiSecurityScan", back_populates="test_plan", cascade="all, delete-orphan")


class ApiSecurityScan(Base):
    """Security test run execution, tracking live pipeline states and telemetry."""
    __tablename__ = "api_security_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("api_test_plans.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(64), default="INITIALIZING")   # INITIALIZING, DISCOVERING, RUNNING_TESTS, ANALYZING, GENERATING_REPORT, COMPLETED, FAILED, STOPPED
    current_test = Column(String(255), nullable=True)     # BOLA verification on /api/v1/orders/{id}
    progress_pct = Column(Integer, default=0)             # 0 to 100
    tests_total = Column(Integer, default=0)
    tests_passed = Column(Integer, default=0)
    tests_failed = Column(Integer, default=0)
    findings_critical = Column(Integer, default=0)
    findings_high = Column(Integer, default=0)
    findings_medium = Column(Integer, default=0)
    findings_low = Column(Integer, default=0)
    tests_skipped = Column(Integer, default=0)
    tests_errored = Column(Integer, default=0)
    scan_config = Column(JSON, default=dict)              # Persisted validated execution configuration
    elapsed_seconds = Column(Integer, default=0)
    execution_logs = Column(JSON, default=list)           # [{"time": "...", "message": "...", "level": "INFO"}]
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    api_target = relationship("ApiTarget", back_populates="scans")
    test_plan = relationship("ApiTestPlan", back_populates="scans")
    findings = relationship("ApiFinding", back_populates="scan", cascade="all, delete-orphan")
    test_cases = relationship("ApiTestCase", back_populates="scan", cascade="all, delete-orphan")


class ApiTestCase(Base):
    """Specific test case generated and executed against an endpoint, tracking live execution evidence."""
    __tablename__ = "api_test_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("api_security_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("api_test_plans.id", ondelete="SET NULL"), nullable=True, index=True)
    endpoint_id = Column(UUID(as_uuid=True), ForeignKey("api_endpoints.id", ondelete="SET NULL"), nullable=True, index=True)
    test_identifier = Column(String(128), nullable=False) # e.g. TC-BOLA-001, TC-AUTH-002
    name = Column(String(512), nullable=False)
    endpoint_path = Column(String(1024), nullable=False)
    http_method = Column(String(16), nullable=False)
    category = Column(String(128), nullable=False)
    objective = Column(Text, nullable=False)
    preconditions = Column(JSON, default=dict)
    request_spec = Column(JSON, default=dict)
    expected_behavior = Column(Text, nullable=False)
    observed_behavior = Column(Text, nullable=True)
    status = Column(String(32), default="PENDING")        # PENDING, RUNNING, PASSED, FAILED, SKIPPED, ERROR, INCONCLUSIVE
    execution_duration_ms = Column(Integer, default=0)
    response_status = Column(Integer, nullable=True)
    evidence = Column(JSON, default=dict)
    severity = Column(String(32), default="INFO")
    confidence = Column(String(32), default="CERTAIN")    # CERTAIN, FIRM, TENTATIVE, INCONCLUSIVE
    remediation_guidance = Column(Text, nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime(timezone=True), nullable=True)

    scan = relationship("ApiSecurityScan", back_populates="test_cases")



class ApiFinding(Base):
    """Specific vulnerability identified on an API or endpoint with cryptographic evidence."""
    __tablename__ = "api_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("api_security_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint_id = Column(UUID(as_uuid=True), ForeignKey("api_endpoints.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(512), nullable=False)
    category = Column(String(128), nullable=False)        # Authorization, Authentication, Rate Limiting, Injection, Data Exposure, Schema
    severity = Column(String(32), default="MEDIUM")        # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(64), default="OPEN")            # OPEN, RESOLVED, FALSE_POSITIVE, ACCEPTED_RISK
    cwe = Column(String(64), nullable=True)                # CWE-639, CWE-89, CWE-287
    owasp_category = Column(String(128), nullable=True)    # API1:2023 Broken Object Level Authorization
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=True)
    affected_endpoints = Column(JSON, default=list)        # ["/api/v1/orders/{id}", "/api/v1/users/{id}/orders"]
    evidence = Column(JSON, default=dict)                  # {"request": "...", "response": "...", "assertion": "..."}
    remediation_advice = Column(Text, nullable=True)
    remediation_patch = Column(Text, nullable=True)        # Unified diff proposal
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    api_target = relationship("ApiTarget", back_populates="findings")
    endpoint = relationship("ApiEndpoint", back_populates="findings")
    scan = relationship("ApiSecurityScan", back_populates="findings")


class ApiAttackPath(Base):
    """Correlated attack paths traversing chained vulnerabilities across API endpoints."""
    __tablename__ = "api_attack_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(UUID(as_uuid=True), nullable=True)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="HIGH")
    likelihood = Column(String(32), default="HIGH")
    steps = Column(JSON, default=list)                     # [{"step": 1, "title": "...", "endpoint": "...", "action": "..."}]
    impact = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ApiReport(Base):
    """Executive and technical reports generated from security analysis."""
    __tablename__ = "api_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id = Column(UUID(as_uuid=True), ForeignKey("api_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(UUID(as_uuid=True), nullable=True)
    format = Column(String(32), default="PDF")             # PDF, JSON, HTML
    title = Column(String(255), nullable=False)
    summary = Column(JSON, default=dict)
    download_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
