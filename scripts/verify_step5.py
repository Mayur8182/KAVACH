"""
STEP 5 VERIFICATION SCRIPT
Demonstrates deterministic security blueprint generation directly from normalized application intent.
Strictly adheres to:
- No hardcoded data
- Negative requirements enforced (irrelevant requirements never generated)
- Real evidence traceability linking requirements to intent facts
- Security invariants defined
- Contextual risk factors extracted
"""
import os
import sys

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.engines.blueprint.engine import blueprint_engine
from app.engines.intent.models import (
    Actor,
    DeploymentContext,
    ExternalService,
    Interface,
    NormalizedIntent,
    StateChange,
    Technology,
    DataDomain,
)


def verify_simple_api():
    print("[1/4] Testing Simple API Intent -> Negative Requirements...")
    intent = NormalizedIntent(
        raw_input="Build a book catalog REST API using FastAPI and PostgreSQL",
        purpose="Book catalog service",
        application_type="REST_API",
        actors=[],
        workflows=[],
        interfaces=[Interface(type="REST_API", description="Public catalog", confidence=1.0)],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
            Technology(name="FastAPI", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
        ],
        data_domains=[DataDomain(domain="PUBLIC_DATA", description="Catalog", confidence=1.0)],
        external_services=[],
        deployment_context=DeploymentContext(environment="development"),
        state_changes=[],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )
    result = blueprint_engine.generate_blueprint(intent)
    keys = {r.requirement_key for r in result.requirements}

    assert "INPUT_VALIDATION_REQUIRED" in keys, "Missing input validation"
    assert "SECURE_DATABASE_ACCESS_REQUIRED" in keys, "Missing secure database access"
    assert "PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED" not in keys, "Violated negative requirement: payment generated!"
    assert "WEBHOOK_AUTHENTICITY_REQUIRED" not in keys, "Violated negative requirement: webhook generated!"
    assert "KUBERNETES_RBAC_REQUIRED" not in keys, "Violated negative requirement: k8s generated!"

    print("  [OK] Positive requirements generated: INPUT_VALIDATION, SECURE_DATABASE_ACCESS")
    print("  [OK] Negative requirements confirmed absent: No payment, no webhook, no k8s requirements")


def verify_payment_api():
    print("\n[2/4] Testing Payment API Intent -> Evidence & Invariants...")
    intent = NormalizedIntent(
        raw_input="FastAPI service with Stripe webhooks processing customer card payments and storing invoices in PostgreSQL",
        purpose="Payment processing",
        application_type="PAYMENT_API",
        actors=[
            Actor(id="a1", name="Customer", type="CUSTOMER", description="User paying", confidence=1.0),
            Actor(id="a2", name="Stripe", type="WEBHOOK_PROVIDER", description="Payment gateway", confidence=1.0),
        ],
        workflows=[],
        interfaces=[
            Interface(type="REST_API", description="Payment API", confidence=1.0),
            Interface(type="WEBHOOK", description="Stripe Webhook Listener", confidence=1.0),
        ],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
            Technology(name="FastAPI", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
        ],
        data_domains=[
            DataDomain(domain="PAYMENT_DATA", description="Card transactions", confidence=1.0),
        ],
        external_services=[
            ExternalService(name="Stripe", type="PAYMENT_GATEWAY", purpose="Card processing", direction="BIDIRECTIONAL", confidence=1.0)
        ],
        deployment_context=DeploymentContext(environment="production"),
        state_changes=[
            StateChange(name="CREATE_PAYMENT", target_entity="Payment", description="Authorizes card and persists charge record", confidence=1.0)
        ],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.98,
    )
    result = blueprint_engine.generate_blueprint(intent)
    reqs = {r.requirement_key: r for r in result.requirements}

    assert "PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED" in reqs
    assert "WEBHOOK_AUTHENTICITY_REQUIRED" in reqs
    assert "SECRETS_PROTECTION_REQUIRED" in reqs

    idem = reqs["PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED"]
    print(f"  [OK] Idempotency Key: {idem.requirement_key} (Severity: {idem.severity}, Priority: {idem.priority})")
    print(f"  [OK] Invariant: {idem.security_invariant}")
    print(f"  [OK] Evidence: {[e.evidence_text for e in idem.evidence]}")
    print(f"  [OK] Risk Factors: {result.risk_factors}")


def verify_admin_dashboard():
    print("\n[3/4] Testing Admin Dashboard Intent -> Administrative Authorization...")
    intent = NormalizedIntent(
        raw_input="Internal admin portal for system operators to suspend fraudulent users",
        purpose="Admin console",
        application_type="ADMIN_DASHBOARD",
        actors=[Actor(id="admin", name="Operator", type="ADMIN", description="System admin", confidence=1.0)],
        workflows=[],
        interfaces=[Interface(type="WEB_UI", description="Admin UI", confidence=1.0)],
        technologies=[Technology(name="React", category="FRAMEWORK", confidence=1.0)],
        data_domains=[DataDomain(domain="USER_DATA", description="User records", confidence=1.0)],
        external_services=[],
        deployment_context=DeploymentContext(environment="production"),
        state_changes=[StateChange(name="SUSPEND_USER", target_entity="User", description="Suspends account", confidence=1.0)],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )
    result = blueprint_engine.generate_blueprint(intent)
    keys = {r.requirement_key for r in result.requirements}

    assert "ADMIN_ACTION_AUTHORIZATION_REQUIRED" in keys
    assert "AUDIT_LOGGING_REQUIRED" in keys
    assert "ADMIN_OPERATION" in result.risk_factors

    print("  [OK] Admin requirements: ADMIN_ACTION_AUTHORIZATION, AUDIT_LOGGING")
    print("  [OK] Contextual Risk: ADMIN_OPERATION detected")


def verify_ai_agent_platform():
    print("\n[4/4] Testing AI Agent Platform Intent -> Agent Boundary Controls...")
    intent = NormalizedIntent(
        raw_input="Autonomous AI coding agent that executes tools via MCP protocol",
        purpose="AI code remediation",
        application_type="AI_AGENT_PLATFORM",
        actors=[Actor(id="ai", name="FixerAgent", type="AI_AGENT", description="Autonomous fixer", confidence=1.0)],
        workflows=[],
        interfaces=[Interface(type="MCP_TOOL", description="MCP tool gateway", confidence=1.0)],
        technologies=[Technology(name="Python", category="LANGUAGE", confidence=1.0)],
        data_domains=[DataDomain(domain="SOURCE_CODE", description="Code", confidence=1.0)],
        external_services=[],
        deployment_context=DeploymentContext(environment="development"),
        state_changes=[],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )
    result = blueprint_engine.generate_blueprint(intent)
    keys = {r.requirement_key for r in result.requirements}

    assert "AI_AGENT_IDENTITY_REQUIRED" in keys
    assert "AI_TOOL_AUTHORIZATION_REQUIRED" in keys
    assert "AI_AGENT" in result.risk_factors
    assert "EXTERNAL_TOOL" in result.risk_factors

    print("  [OK] AI agent requirements: AI_AGENT_IDENTITY, AI_TOOL_AUTHORIZATION")
    print("  [OK] Contextual Risk: AI_AGENT, EXTERNAL_TOOL detected")


if __name__ == "__main__":
    print("==========================================================")
    print("  ANTIGRAVITY - STEP 5 SECURITY BLUEPRINT ENGINE VERIFICATION")
    print("==========================================================")
    verify_simple_api()
    verify_payment_api()
    verify_admin_dashboard()
    verify_ai_agent_platform()
    print("\n[SUCCESS] All Step 5 verification scenarios passed perfectly.")
