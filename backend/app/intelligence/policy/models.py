"""
Kavach Phase 5: AI Security Policy Engine Canonical Models
Defines canonical schemas, enums, evaluation contracts, and structured intents.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class PolicyDomain(str, enum.Enum):
    APPLICATION = "APPLICATION"
    DEPENDENCY = "DEPENDENCY"
    CONTAINER = "CONTAINER"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    IDENTITY = "IDENTITY"
    AI_AGENT = "AI_AGENT"


class PolicyScope(str, enum.Enum):
    GLOBAL = "GLOBAL"          # Organization / Tenant level
    PROJECT = "PROJECT"        # Specific project
    ENVIRONMENT = "ENVIRONMENT"# development, staging, production
    OPERATION = "OPERATION"    # Single operation type (e.g., DEPLOY, MCP_TOOL)


class PolicyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    STATIC_VALIDATED = "STATIC_VALIDATED"
    TESTED = "TESTED"
    SIMULATED = "SIMULATED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    STAGED = "STAGED"
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    DISABLED = "DISABLED"


class DecisionOutcome(str, enum.Enum):
    """The 5 canonical policy decision outcomes required by Phase 5 spec."""
    ALLOW = "allow"
    DENY = "deny"
    WARN = "warn"
    NOT_APPLICABLE = "not_applicable"
    INDETERMINATE = "indeterminate"


class EnforcementPoint(str, enum.Enum):
    GITHUB_PR = "GITHUB_PR"
    CI_CD = "CI_CD"
    MCP_GATEWAY = "MCP_GATEWAY"
    CLOUD_RUNTIME = "CLOUD_RUNTIME"
    DEPLOYMENT_GATE = "DEPLOYMENT_GATE"


class EnforcementResult(str, enum.Enum):
    BLOCKED = "BLOCKED"
    ALLOWED = "ALLOWED"
    WARNED = "WARNED"
    BYPASSED_OVERRIDE = "BYPASSED_OVERRIDE"
    SIMULATED = "SIMULATED"
    FAILED = "FAILED"


# ─────────────────────────────────────────────────────────────────────────────
# Structured Policy Intent (Intermediate Representation for NL Authoring)
# ─────────────────────────────────────────────────────────────────────────────

class PolicyIntent(BaseModel):
    """
    Intermediate Representation (IR) for natural language policy authoring.
    Prevents hallucinated rules and makes candidate policies reviewable.
    """
    model_config = ConfigDict(from_attributes=True)

    subject: str = Field(..., description="What is evaluated (e.g. 'pull_request', 'deployment', 'agent_tool')")
    resource: str = Field(..., description="Target asset or scope (e.g. 'production_workload', 's3_bucket')")
    action: str = Field(..., description="Attempted operation (e.g. 'deploy', 'merge', 'execute_write_tool')")
    domain: PolicyDomain
    scope: PolicyScope = PolicyScope.PROJECT
    conditions: List[Dict[str, Any]] = Field(default_factory=list, description="Authoritative facts required")
    decision: DecisionOutcome = DecisionOutcome.DENY
    is_non_exemptible: bool = Field(False, description="Whether policy waivers can be granted")
    evidence_requirements: List[str] = Field(default_factory=list, description="Required data sources (e.g. sast_scan, reachability)")
    remediation_guidance: Optional[str] = None
    enforcement_point: EnforcementPoint = EnforcementPoint.DEPLOYMENT_GATE


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation Contracts & Context
# ─────────────────────────────────────────────────────────────────────────────

class PolicyEvidenceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evidence_type: str  # FINDING, REQUIREMENT, ENVIRONMENT, ACTOR, RESOURCE, AST_DATAFLOW, CLOUD_CONFIG
    source_type: str    # SECURITY_FINDING, CODEBASE_INTELLIGENCE, CISA_KEV, CLUSTER_OBSERVATION, CONTEXT
    source_id: Optional[str] = None
    attribute: str
    observed_value: Any
    expected_condition: str
    effect: str
    rule_key: Optional[str] = None
    policy_version_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MatchedPolicyRule(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_key: str
    rule_name: str
    policy_id: str
    policy_name: str
    policy_version: int
    policy_version_id: str
    policy_content_hash: str
    decision: DecisionOutcome
    reason_code: str
    rationale: str
    priority: int = 100
    is_non_exemptible: bool = False
    evidence_items: List[PolicyEvidenceItem] = Field(default_factory=list)


class PolicyContextSnapshot(BaseModel):
    """
    Immutable, timestamped facts used for deterministic evaluation.
    Provides complete reproducibility of decisions.
    """
    model_config = ConfigDict(from_attributes=True)

    snapshot_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    repository: Optional[str] = None
    commit_sha: Optional[str] = "HEAD"
    environment: str = "development"
    actor: Dict[str, Any] = Field(default_factory=dict)
    operation: Dict[str, Any] = Field(default_factory=dict)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    reachability_facts: List[Dict[str, Any]] = Field(default_factory=list)
    ast_taint_paths: List[Dict[str, Any]] = Field(default_factory=list)
    cloud_resources: List[Dict[str, Any]] = Field(default_factory=list)
    active_exceptions: List[Dict[str, Any]] = Field(default_factory=list)
    is_fresh: bool = True
    missing_facts: List[str] = Field(default_factory=list)


class PolicyDecisionRecord(BaseModel):
    """
    Complete output of a deterministic policy evaluation.
    """
    model_config = ConfigDict(from_attributes=True)

    decision_id: str
    decision: DecisionOutcome
    reason: str
    reason_codes: List[str] = Field(default_factory=list)
    policy_version_ids: List[str] = Field(default_factory=list)
    matched_rules: List[MatchedPolicyRule] = Field(default_factory=list)
    unmatched_rule_keys: List[str] = Field(default_factory=list)
    evidence: List[PolicyEvidenceItem] = Field(default_factory=list)
    exceptions_applied: List[Dict[str, Any]] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)
    context_snapshot_id: str
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evaluator_version: str = "kavach-policy-engine-v5.0"
    is_enforceable: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Simulation & Testing Contracts
# ─────────────────────────────────────────────────────────────────────────────

class SimulationImpactReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    policy_id: str
    policy_version: int
    policy_content_hash: str
    simulated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    snapshots_evaluated_count: int
    total_resources_evaluated: int
    outcome_distribution: Dict[str, int] = Field(default_factory=dict)
    new_blockers_detected: int = 0
    violations_count: int = 0
    potential_false_positives: List[Dict[str, Any]] = Field(default_factory=list)
    affected_repositories: List[str] = Field(default_factory=list)
    evaluation_latency_ms: float = 0.0
    has_blocking_impact: bool = False

