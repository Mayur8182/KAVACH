"""Comprehensive tests for the end-to-end Sales / Demo / POC / Proposal / Contract / Onboarding lifecycle.

Verifies:
- Book a Demo & Request Demo Form
- Contact Sales & Enterprise Inquiry
- Talk to Security Expert
- Sales Qualification (MEDDIC / BANT scoring)
- Demo Workspace & Live Security Simulation
- Customer POC Request, Workspace, Progress & Results
- Enterprise Proposal / Quote (CPQ)
- Contract / Agreement generation & Digital Signature execution
- Enterprise Onboarding milestones & progress tracking
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sales_and_demo_full_flow(client: AsyncClient):
    # 1. Book a Demo
    book_resp = await client.post(
        "/api/v1/sales/book-demo",
        json={
            "name": "Jane Doe",
            "email": "jane@acmecorp.com",
            "company": "Acme Aerospace",
            "job_title": "Head of DevSecOps",
            "preferred_date": "2026-10-20",
            "preferred_time_slot": "10:00 AM EST",
            "timezone": "America/New_York",
            "primary_focus": "Agent Governance & MCP Gateway",
            "assigned_expert": "Dr. Elena Rostova, Principal AI Security Architect",
            "notes": "Evaluating MCP sandboxing for agent fleet",
        },
    )
    assert book_resp.status_code == 201
    book_data = book_resp.json()
    assert book_data["status"] == "success"
    assert "booking_id" in book_data
    assert "meeting_url" in book_data
    assert book_data["lead_score"] >= 65

    # 2. Request Demo Form
    req_resp = await client.post(
        "/api/v1/sales/request-demo",
        json={
            "name": "John Smith",
            "email": "john@globaldefense.io",
            "company": "Global Defense Systems",
            "job_title": "VP Software Engineering",
            "team_size": "201-1000",
            "cloud_provider": "AWS GovCloud",
            "deployment_target": "Dedicated VPC / GovCloud",
            "primary_focus": "Code SAST, Cloud CSPM & AI Agent Defense",
            "current_tooling": "GitHub Advanced Security",
            "notes": "Looking for sub-minute PR scan latency",
        },
    )
    assert req_resp.status_code == 201
    req_data = req_resp.json()
    assert req_data["status"] == "success"
    assert "request_id" in req_data
    lead_id = req_data["request_id"]

    # 3. Contact Sales
    sales_resp = await client.post(
        "/api/v1/sales/contact-sales",
        json={
            "name": "Sarah Connor",
            "email": "sarah@techdefense.org",
            "company": "Tech Defense Inc",
            "team_size": "100-500",
            "deployment_target": "Dedicated VPC",
            "message": "We need custom enterprise licensing for 150 developers.",
        },
    )
    assert sales_resp.status_code == 201
    sales_data = sales_resp.json()
    assert sales_data["status"] == "success"

    # 4. Enterprise Inquiry
    ent_resp = await client.post(
        "/api/v1/sales/enterprise-inquiry",
        json={
            "name": "Col. Vance",
            "email": "vance@aerocorp.gov",
            "company": "Aero Corp Defense",
            "team_size": "500+",
            "compliance_frameworks": ["FedRAMP High", "SOC2 Type II"],
            "deployment_target": "Air-gapped Sovereign Enclave",
            "estimated_developer_seats": 200,
            "hsm_agent_signing_required": True,
            "custom_sla_required": True,
            "requirements_overview": "Strict no-egress airgap deployment required.",
        },
    )
    assert ent_resp.status_code == 201
    ent_data = ent_resp.json()
    assert ent_data["status"] == "success"

    # 5. Talk to Security Expert
    expert_resp = await client.post(
        "/api/v1/sales/talk-to-expert",
        json={
            "name": "Alex Mercer",
            "email": "alex@protovance.com",
            "company": "Protovance AI",
            "team_size": "11-50",
            "primary_focus": "AI Agent Governance & MCP Sandbox Defense",
            "notes": "Need to discuss OPA policy compilation for MCP tools",
        },
    )
    assert expert_resp.status_code == 201
    assert expert_resp.json()["status"] == "success"

    # 6. List Leads
    leads_resp = await client.get("/api/v1/sales/leads")
    assert leads_resp.status_code == 200
    leads = leads_resp.json()
    assert len(leads) >= 4

    # 7. Sales Qualification (MEDDIC / BANT)
    qual_resp = await client.post(
        "/api/v1/sales/qualify",
        json={
            "demo_request_id": lead_id,
            "company_name": "Global Defense Systems",
            "stage": "QUALIFIED",
            "metrics": "Eliminate 100% of unverified agent tool invocations in CI",
            "economic_buyer": "EVP & CISO Marcus Vance",
            "decision_criteria": "Deterministic OPA policy enforcement, HSM audit",
            "decision_process": "30-day POC -> SecOps approval -> Legal MSA",
            "identify_pain": "Autonomous agents executing unverified shell commands",
            "champion": "Director of AppSec",
            "budget_confirmed": True,
            "authority_confirmed": True,
            "need_urgency": "IMMEDIATE",
            "timeline": "CURRENT_QUARTER",
        },
    )
    assert qual_resp.status_code == 201
    qual_data = qual_resp.json()
    assert qual_data["qualification_score"] >= 80

    # 8. Demo Workspace & Simulation
    session_resp = await client.get("/api/v1/sales/demo-workspace/session")
    assert session_resp.status_code == 200

    sim_resp = await client.post(
        "/api/v1/sales/demo-workspace/run-simulation",
        json={"scenario_id": "agent_prompt_injection"},
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["policy_decision"]["action"] == "BLOCK"
    assert "cryptographic_proof" in sim_data["policy_decision"]

    # 9. Customer POC Request & Progress
    poc_req_resp = await client.post(
        "/api/v1/sales/poc/request",
        json={
            "company_name": "Global Defense Systems",
            "contact_name": "John Smith",
            "contact_email": "john@globaldefense.io",
            "duration_days": 30,
            "environment_tier": "DEDICATED_SANDBOX",
            "scope_repositories": ["defense/agent-core", "defense/cloud-infra"],
            "scope_cloud_accounts": ["AWS GovCloud us-east-1"],
            "scope_agents_count": 12,
        },
    )
    assert poc_req_resp.status_code == 201
    poc_data = poc_req_resp.json()
    poc_id = poc_data["poc_id"]

    # Verify a milestone criterion
    crit_id = poc_data["success_criteria"][0]["id"]
    verify_resp = await client.post(
        f"/api/v1/sales/poc/{poc_id}/milestone/{crit_id}/verify",
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["milestones_completed"] >= 1

    # Get POC Workspace details
    workspace_resp = await client.get(f"/api/v1/sales/poc/{poc_id}")
    assert workspace_resp.status_code == 200
    assert workspace_resp.json()["days_remaining"] >= 25

    # Get POC Results Scorecard
    results_resp = await client.get(f"/api/v1/sales/poc/{poc_id}/results")
    assert results_resp.status_code == 200
    assert "criteria_scorecard" in results_resp.json()

    # 10. Generate Proposal / Quote (CPQ)
    quote_resp = await client.post(
        "/api/v1/sales/proposal/create",
        json={
            "poc_id": poc_id,
            "company_name": "Global Defense Systems",
            "customer_email": "procurement@globaldefense.io",
            "tier": "ENTERPRISE_PRO",
            "seats_count": 60,
            "agent_runtimes_count": 25,
            "cloud_connectors_count": 4,
            "airgap_deployment": False,
            "dedicated_soc_support": True,
            "custom_opa_authoring": True,
            "hsm_agent_signing": True,
            "commitment_years": 2,
            "billing_terms": "ANNUAL_PREPAY",
        },
    )
    assert quote_resp.status_code == 201
    quote_data = quote_resp.json()
    assert quote_data["arr"] > 50000
    assert quote_data["tcv"] == round(quote_data["arr"] * 2, 2)
    quote_id = quote_data["quote_id"]

    # 11. Generate Contract Agreement & Sign
    contract_resp = await client.post(
        "/api/v1/sales/contract/generate",
        json={
            "quote_id": quote_id,
            "company_name": "Global Defense Systems",
            "legal_entity_name": "Global Defense Systems LLC",
            "customer_signatory_name": "John Smith",
            "customer_signatory_title": "VP Software Engineering",
            "customer_signatory_email": "john@globaldefense.io",
            "arr_amount": quote_data["arr"],
        },
    )
    assert contract_resp.status_code == 201
    contract_data = contract_resp.json()
    contract_id = contract_data["contract_id"]

    # Digital signature execution ceremony
    sign_resp = await client.post(
        f"/api/v1/sales/contract/{contract_id}/sign",
        json={
            "legal_entity_name": "Global Defense Systems LLC",
            "customer_signatory_name": "John Smith",
            "customer_signatory_title": "VP Software Engineering",
            "consent_acknowledged": True,
        },
    )
    assert sign_resp.status_code == 200
    sign_data = sign_resp.json()
    assert sign_data["agreement_status"] == "EXECUTED"
    assert "signature_evidence_hash" in sign_data

    # 12. Enterprise Onboarding Launchpad
    onboard_resp = await client.post(
        "/api/v1/sales/onboarding/start",
        json={
            "contract_id": contract_id,
            "company_name": "Global Defense Systems LLC",
            "primary_admin_name": "John Smith",
            "primary_admin_email": "john@globaldefense.io",
        },
    )
    assert onboard_resp.status_code == 201
    onboard_data = onboard_resp.json()
    onboard_id = onboard_data["onboarding_id"]

    # Update milestone step
    step_resp = await client.post(
        f"/api/v1/sales/onboarding/{onboard_id}/step-update",
        json={
            "step_key": "sso_saml_configured",
            "completed": True,
            "details": {"provider": "Okta", "entity_id": "https://globaldefense.okta.com/saml"},
        },
    )
    assert step_resp.status_code == 200
    assert step_resp.json()["completion_percentage"] >= 25
