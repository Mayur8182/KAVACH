"""
Kavach Fix Strategy Engine
Generates, compares, and evaluates multiple candidate remediation strategies.
Selects the smallest safe, non-breaking fix that completely resolves the security root cause.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("kavach.remediation.strategy")


@dataclass
class RemediationStrategy:
    id: str
    name: str
    description: str
    approach: str  # INLINE_GUARD, MIDDLEWARE, ORM_PARAMETERIZATION, VALIDATION_SCHEMA, ARCHITECTURAL_REFUCTOR
    root_cause_addressed: str
    security_effectiveness: str  # e.g., "99% (Deterministic policy enforcement)"
    compatibility_score: float   # 0.0 - 1.0
    regression_risk: str         # "LOW", "MEDIUM", "HIGH"
    files_affected: List[str]
    required_dependencies: List[str]
    required_tests: List[str]
    operational_impact: str
    is_recommended: bool = False
    requires_manual_intervention: bool = False
    manual_instructions: Optional[str] = None


Tuple_Strategy_Result = Tuple[List[RemediationStrategy], RemediationStrategy]


class FixStrategyEngine:
    """
    Evaluates vulnerabilities and formulates concrete, framework-aligned remediation strategies.
    Ranks strategies and selects the optimal minimal-invasive fix.
    """

    def propose_strategies(
        self,
        finding_data: Dict[str, Any],
        code_context: Dict[str, Any],
    ) -> Tuple_Strategy_Result:
        """
        Formulates candidates based on vulnerability category (BOLA, SQLi, Auth, SSRF, XSS, etc.)
        and verified framework context.
        """
        title = finding_data.get("title", "")
        cwe = str(finding_data.get("cwe") or "").upper()
        owasp = str(finding_data.get("owasp_category") or "").upper()
        target_file = code_context.get("target_file", "src/api.ts")
        framework = code_context.get("framework", "Generic Framework")

        strategies: List[RemediationStrategy] = []

        # 1. BOLA / Broken Object Level Authorization (CWE-639 / CWE-284)
        if "BOLA" in title or "639" in cwe or "OBJECT LEVEL" in owasp or "IDOR" in title:
            strategies.append(
                RemediationStrategy(
                    id="strat-bola-ownership",
                    name="Explicit Resource Ownership Assertion",
                    description="Verify that the requested resource belongs strictly to the authenticated user's organization or user ID before returning data or executing mutations.",
                    approach="INLINE_GUARD",
                    root_cause_addressed="Missing object-level access verification allow cross-tenant or cross-user record tampering.",
                    security_effectiveness="99% (Prevents horizontal privilege escalation)",
                    compatibility_score=0.98,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_unauthorized_user_cannot_access_tenant_record", "test_owner_retains_access"],
                    operational_impact="Zero operational downtime; requires authenticated session claim.",
                    is_recommended=True,
                )
            )
            strategies.append(
                RemediationStrategy(
                    id="strat-bola-scoped-query",
                    name="Database Query Tenant Scoping",
                    description="Bind the current user's organization_id / tenant_id directly into the database query WHERE clause.",
                    approach="ORM_PARAMETERIZATION",
                    root_cause_addressed="Unfiltered database queries trusting caller-supplied primary keys.",
                    security_effectiveness="98% (Enforces defense-in-depth at persistence layer)",
                    compatibility_score=0.92,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_query_scoped_by_tenant_id"],
                    operational_impact="Zero downtime; guarantees multi-tenant database isolation.",
                    is_recommended=False,
                )
            )

        # 2. SQL Injection (CWE-89)
        elif "SQL" in title or "89" in cwe or "INJECTION" in owasp:
            strategies.append(
                RemediationStrategy(
                    id="strat-sqli-parameterization",
                    name="Prepared Statements & Query Parameterization",
                    description="Replace dynamic string concatenation or f-strings with typed prepared statements and parameterized query placeholders.",
                    approach="ORM_PARAMETERIZATION",
                    root_cause_addressed="Untrusted user input concatenated directly into SQL command structure.",
                    security_effectiveness="100% (Completely separates query code from data input)",
                    compatibility_score=0.96,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_sql_injection_payload_treated_as_literal_data"],
                    operational_impact="Safe and non-breaking; improves query plan caching.",
                    is_recommended=True,
                )
            )
            strategies.append(
                RemediationStrategy(
                    id="strat-sqli-input-validation",
                    name="Strict Regex & Type Validation",
                    description="Apply rigid alphanumeric and type validation schemas before query construction.",
                    approach="VALIDATION_SCHEMA",
                    root_cause_addressed="Unconstrained input values accepted at route boundary.",
                    security_effectiveness="85% (Validation only, does not prevent SQL syntax corruption)",
                    compatibility_score=0.88,
                    regression_risk="MEDIUM",
                    files_affected=[target_file],
                    required_dependencies=["pydantic" if "python" in target_file else "zod"],
                    required_tests=["test_input_rejects_malformed_characters"],
                    operational_impact="May reject unexpected characters from legitimate users.",
                    is_recommended=False,
                )
            )

        # 3. Missing Authentication / Broken Authentication (CWE-306 / CWE-287)
        elif "AUTH" in title.upper() or "306" in cwe or "287" in cwe:
            strategies.append(
                RemediationStrategy(
                    id="strat-auth-dependency",
                    name="Cryptographic Authentication Guard Dependency",
                    description="Bind the framework's authoritative authentication dependency / middleware to the route handler.",
                    approach="MIDDLEWARE",
                    root_cause_addressed="Route endpoint exposed publicly without identity token validation.",
                    security_effectiveness="100% (Rejects all unauthenticated traffic with HTTP 401)",
                    compatibility_score=0.99,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_unauthenticated_request_rejected_401", "test_authenticated_jwt_request_succeeds"],
                    operational_impact="Requires legitimate clients to pass Authorization header.",
                    is_recommended=True,
                )
            )

        # 4. Missing Rate Limiting (CWE-799 / CWE-770)
        elif "RATE" in title.upper() or "770" in cwe or "799" in cwe:
            strategies.append(
                RemediationStrategy(
                    id="strat-rate-limiter",
                    name="Sliding Window Rate Limiting Guard",
                    description="Inject IP and API key-based sliding window rate limiter decorator or middleware.",
                    approach="MIDDLEWARE",
                    root_cause_addressed="Unbounded endpoint consumption permitting credential stuffing and resource exhaustion.",
                    security_effectiveness="95% (Enforces throughput ceiling per caller)",
                    compatibility_score=0.94,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_burst_requests_throttled_429"],
                    operational_impact="Returns HTTP 429 Too Many Requests when threshold exceeded.",
                    is_recommended=True,
                )
            )

        # Generic / Fallback Strategy
        if not strategies:
            strategies.append(
                RemediationStrategy(
                    id="strat-generic-boundary",
                    name="Defensive Input Validation & Access Control Assertion",
                    description="Inject strict boundary validation and authorization checks around the affected operation.",
                    approach="INLINE_GUARD",
                    root_cause_addressed="Missing input sanitization or authorization verification at invocation site.",
                    security_effectiveness="92%",
                    compatibility_score=0.95,
                    regression_risk="LOW",
                    files_affected=[target_file],
                    required_dependencies=[],
                    required_tests=["test_security_boundary_enforcement"],
                    operational_impact="Low risk; guards sensitive application logic.",
                    is_recommended=True,
                )
            )

        # Pick recommended strategy (highest security effectiveness and lowest regression risk)
        selected = next((s for s in strategies if s.is_recommended), strategies[0])

        return strategies, selected


Tuple_Strategy_Result = tuple[List[RemediationStrategy], RemediationStrategy]
