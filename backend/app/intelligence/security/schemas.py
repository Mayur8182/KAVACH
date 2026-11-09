"""
Kavach Security Intelligence Engine (SIE) — Canonical Schemas & Data Contracts.
Strict compliance with:
- "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
- AGENTS.md Rule 1: No hardcoded data.
- AGENTS.md Rule 13: Every security decision must have evidence.
- AGENTS.md Rule 14: LLM is not the security authority.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScannerSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


class NormalizedSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


class FindingCategory(str, Enum):
    SAST = "SAST"
    SECRETS = "SECRETS"
    SCA = "SCA"
    CONTAINER = "CONTAINER"
    IAC = "IAC"
    API = "API"
    CLOUD = "CLOUD"


class FindingType(str, Enum):
    CODE_VULNERABILITY = "CODE_VULNERABILITY"
    HARDCODED_SECRET = "HARDCODED_SECRET"
    DEPENDENCY_VULNERABILITY = "DEPENDENCY_VULNERABILITY"
    MISCONFIGURATION = "MISCONFIGURATION"
    API_EXPOSURE = "API_EXPOSURE"
    CLOUD_EXPOSURE = "CLOUD_EXPOSURE"


class ReachabilityStatus(str, Enum):
    NOT_ASSESSED = "not_assessed"
    NOT_RESOLVED = "not_resolved"
    NO_PATH_FOUND = "no_path_found"
    CANDIDATE_PATH = "candidate_path"
    PATH_WITH_MITIGATION = "path_with_mitigation"
    RUNTIME_SUPPORTED = "runtime_supported"
    UNKNOWN = "unknown"


class AttackPathStatus(str, Enum):
    CANDIDATE = "candidate"
    PARTIALLY_SUPPORTED = "partially_supported"
    MITIGATED_CANDIDATE = "mitigated_candidate"
    RUNTIME_OBSERVED = "runtime_observed"
    VALIDATED_IN_TEST = "validated_in_test"
    REJECTED = "rejected"


class PriorityBand(str, Enum):
    P0 = "P0"  # Immediate review (critical exposure, known exploited, reachable)
    P1 = "P1"  # Urgent (high impact + reachable from exposed surface)
    P2 = "P2"  # Planned remediation (material risk, internal or unverified path)
    P3 = "P3"  # Routine (lower impact or strong mitigating controls)
    P4 = "P4"  # Informational / Monitor (low impact, test files, zero reachability)


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class DeduplicationClass(str, Enum):
    EXACT_DUPLICATE = "EXACT_DUPLICATE"
    CROSS_SCANNER_EQUIVALENT = "CROSS_SCANNER_EQUIVALENT"
    RELATED = "RELATED"
    SIMILAR = "SIMILAR"
    NEW = "NEW"


class AssetExposure(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    RESTRICTED = "RESTRICTED"
    UNKNOWN = "UNKNOWN"


# ── Canonical Supporting Data Structures ──────────────────────────────────────

class FindingObservation(BaseModel):
    """An empirical observation produced by a specific scanner execution."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    scanner_name: str
    scanner_version: Optional[str] = None
    scanner_execution_id: Optional[uuid.UUID] = None
    raw_finding_reference: Optional[str] = None
    observed_rule_id: str
    observed_severity: str
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class FindingEvidence(BaseModel):
    """Grounding evidence pointing to exact repository coordinates and syntax spans."""
    file_path: str
    start_line: int
    end_line: int
    column_start: Optional[int] = None
    snippet: Optional[str] = None
    symbol_key: Optional[str] = None
    symbol_name: Optional[str] = None
    symbol_kind: Optional[str] = None
    route_endpoint: Optional[str] = None
    http_method: Optional[str] = None
    sink_call: Optional[str] = None
    content_hash: Optional[str] = None


class FindingEnrichment(BaseModel):
    """Authoritative CVE / CWE / KEV / EPSS vulnerability intelligence."""
    cve_id: Optional[str] = None
    cwe_ids: List[str] = Field(default_factory=list)
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    is_known_exploited: bool = False  # CISA KEV
    epss_score: Optional[float] = None  # FIRST EPSS (0.0 to 1.0)
    advisory_ids: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    affected_package: Optional[str] = None
    affected_version_range: Optional[str] = None
    fixed_version: Optional[str] = None
    source_provider: str = "NVD/OSV/CISA"
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_stale: bool = False


class ReachabilityHop(BaseModel):
    """One link in a static call or dataflow chain from entrypoint to sink."""
    hop_index: int
    source_entity: str
    target_entity: str
    file_path: str
    line_number: int
    relationship: str  # calls, calls_sink, defines_route, imports
    confidence: float = 1.0


class ReachabilityAssessment(BaseModel):
    """Evaluation of whether vulnerable code is reachable from an exposed entry point."""
    status: ReachabilityStatus = ReachabilityStatus.NOT_ASSESSED
    confidence: ConfidenceLevel = ConfidenceLevel.UNKNOWN
    entrypoint: Optional[str] = None  # e.g. "POST /api/orders"
    entrypoint_file: Optional[str] = None
    entrypoint_line: Optional[int] = None
    call_hops: List[ReachabilityHop] = Field(default_factory=list)
    sink_name: Optional[str] = None  # e.g. "cursor.execute"
    sink_file: Optional[str] = None
    sink_line: Optional[int] = None
    mitigations: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    assessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AttackPathCandidate(BaseModel):
    """A plausible chain connecting an entry point to sensitive assets through vulnerabilities."""
    path_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    title: str
    status: AttackPathStatus = AttackPathStatus.CANDIDATE
    entrypoint_asset: str
    target_asset: str
    hops: List[ReachabilityHop] = Field(default_factory=list)
    associated_finding_ids: List[str] = Field(default_factory=list)
    preconditions: List[str] = Field(default_factory=list)
    mitigations: List[str] = Field(default_factory=list)
    missing_links: List[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FindingRiskAssessment(BaseModel):
    """Deterministic, transparent, explainable contextual priority assessment."""
    priority_score: float = Field(ge=0.0, le=100.0, description="0 to 100 contextual priority index")
    priority_band: PriorityBand
    severity_component: float
    exploit_signal_component: float
    reachability_component: float
    exposure_component: float
    asset_impact_component: float
    mitigation_component: float
    reason_codes: List[str] = Field(default_factory=list)
    positive_factors: List[str] = Field(default_factory=list)
    mitigating_factors: List[str] = Field(default_factory=list)
    scoring_version: str = "v1.0"
    assessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SecurityAsset(BaseModel):
    """An asset affected by or contributing to a security finding."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    organization_id: uuid.UUID
    project_id: uuid.UUID
    asset_type: str  # REPOSITORY, FILE, SYMBOL, ROUTE, PACKAGE, CLOUD_RESOURCE, CONTAINER
    name: str
    identifier: str
    exposure: AssetExposure = AssetExposure.UNKNOWN
    is_production: bool = True
    data_sensitivity: str = "STANDARD"  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    properties: Dict[str, Any] = Field(default_factory=dict)


# ── Canonical Finding Entity ─────────────────────────────────────────────────

class CanonicalFinding(BaseModel):
    """
    Central, normalized, deduplicated security finding in Kavach.
    Preserves all raw scanner observations and links to Phase 1 code intelligence.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    organization_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    repository_id: Optional[uuid.UUID] = None
    repository: Optional[str] = None
    branch: str = "main"
    commit_sha: Optional[str] = None

    canonical_fingerprint: str
    fingerprint_version: str = "v1.0"

    title: str
    description: str
    category: FindingCategory
    finding_type: FindingType
    rule_id: str

    scanner_severity: ScannerSeverity
    normalized_severity: NormalizedSeverity
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH

    status: str = "open"  # open, resolved, suppressed, accepted_risk
    verification_status: str = "VERIFIED"

    package_name: Optional[str] = None
    installed_version: Optional[str] = None
    fixed_version: Optional[str] = None

    evidence: FindingEvidence
    observations: List[FindingObservation] = Field(default_factory=list)
    enrichment: Optional[FindingEnrichment] = None
    reachability: Optional[ReachabilityAssessment] = None
    risk_assessment: Optional[FindingRiskAssessment] = None
    related_finding_ids: List[str] = Field(default_factory=list)

    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    suppressed_at: Optional[datetime] = None
    suppression_reason: Optional[str] = None


class EvidencePackage(BaseModel):
    """Structured, citation-backed evidence package returned to agents and the UI."""
    finding_id: str
    repository_id: Optional[str] = None
    commit_sha: Optional[str] = None
    title: str
    category: str
    severity: str
    priority_band: str
    priority_score: float
    evidence_coordinates: Dict[str, Any]
    enrichment: Optional[Dict[str, Any]] = None
    reachability: Dict[str, Any]
    attack_paths: List[Dict[str, Any]] = Field(default_factory=list)
    reason_codes: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    recommended_action: str

