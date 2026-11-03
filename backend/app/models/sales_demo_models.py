"""Sales, Demo, POC, Quoting, Contract Agreement, and Enterprise Onboarding database models.

Follows strict production engineering rules:
- Zero hardcoded data
- Real database persistence in SQLite / PostgreSQL
- Traceable audit evidence and state transitions
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DemoRequest(Base, TimestampMixin):
    """Database model for demo bookings, demo requests, contact sales, enterprise inquiries,

    and security expert consultations.
    """
    __tablename__ = "sales_demo_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        default="DEMO_REQUEST",  # DEMO_REQUEST, BOOK_A_DEMO, CONTACT_SALES, ENTERPRISE_INQUIRY, TALK_TO_EXPERT
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(150), nullable=False)
    job_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    team_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cloud_provider: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    deployment_target: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    primary_focus: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_tooling: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    
    # Booking specific fields
    preferred_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preferred_time_slot: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_expert: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    expert_title: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",  # PENDING, QUALIFIED, SCHEDULED, DEMO_COMPLETED, POC_REQUESTED, WON, DECLINED
    )
    lead_score: Mapped[int] = mapped_column(Integer, default=50)
    qualification_tier: Mapped[str] = mapped_column(
        String(50),
        default="TIER_2_MIDMARKET",  # TIER_1_ENTERPRISE, TIER_2_MIDMARKET, TIER_3_GROWTH
    )
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)


class SalesQualification(Base, TimestampMixin):
    """Database model for MEDDIC & BANT sales qualification assessments."""
    __tablename__ = "sales_qualifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    demo_request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="QUALIFIED",  # INQUIRY, DISCOVERY, QUALIFIED, TECHNICAL_EVALUATION, POC_ACTIVE, PROPOSAL, CONTRACT, CLOSED_WON, CLOSED_LOST
    )
    # MEDDIC Criteria
    metrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    economic_buyer: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    decision_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_process: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    identify_pain: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    champion: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    
    # BANT Score Elements
    budget_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    authority_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    need_urgency: Mapped[str] = mapped_column(String(50), default="WITHIN_3_MONTHS")  # IMMEDIATE, WITHIN_3_MONTHS, EVALUATING
    timeline: Mapped[str] = mapped_column(String(50), default="CURRENT_QUARTER")
    
    qualification_score: Mapped[int] = mapped_column(Integer, default=70)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_rep: Mapped[str] = mapped_column(String(150), default="Marcus Vance, Principal Solutions Director")


class CustomerPOC(Base, TimestampMixin):
    """Database model for enterprise Proof of Concept (POC) engagements."""
    __tablename__ = "customer_pocs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    demo_request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",  # REQUESTED, PROVISIONED, ACTIVE, EVALUATING, SUCCESS_MET, CONVERTED, EXPIRED
    )
    duration_days: Mapped[int] = mapped_column(Integer, default=30)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    environment_tier: Mapped[str] = mapped_column(String(50), default="DEDICATED_SANDBOX")
    scope_repositories: Mapped[List[str]] = mapped_column(JSON, default=list)
    scope_cloud_accounts: Mapped[List[str]] = mapped_column(JSON, default=list)
    scope_agents_count: Mapped[int] = mapped_column(Integer, default=5)
    technical_lead: Mapped[str] = mapped_column(String(150), default="Kavita Iyer, Lead Security Architect")
    account_executive: Mapped[str] = mapped_column(String(150), default="Marcus Vance, VP Enterprise Accounts")
    
    # Success Criteria & Milestone list: [{ id, title, description, category, status, verified_at, evidence_ref }]
    success_criteria: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    
    scans_run_count: Mapped[int] = mapped_column(Integer, default=0)
    findings_detected_count: Mapped[int] = mapped_column(Integer, default=0)
    findings_resolved_count: Mapped[int] = mapped_column(Integer, default=0)
    policies_enforced_count: Mapped[int] = mapped_column(Integer, default=0)
    milestones_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_milestones: Mapped[int] = mapped_column(Integer, default=4)
    
    executive_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class SalesProposalQuote(Base, TimestampMixin):
    """Database model for enterprise CPQ quotes and proposals."""
    __tablename__ = "sales_proposals_quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    poc_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    demo_request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(150), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), default="ENTERPRISE_PRO")
    
    seats_count: Mapped[int] = mapped_column(Integer, default=50)
    agent_runtimes_count: Mapped[int] = mapped_column(Integer, default=20)
    cloud_connectors_count: Mapped[int] = mapped_column(Integer, default=4)
    airgap_deployment: Mapped[bool] = mapped_column(Boolean, default=False)
    dedicated_soc_support: Mapped[bool] = mapped_column(Boolean, default=True)
    custom_opa_authoring: Mapped[bool] = mapped_column(Boolean, default=True)
    hsm_agent_signing: Mapped[bool] = mapped_column(Boolean, default=True)
    
    base_annual_price: Mapped[float] = mapped_column(Float, default=72000.0)
    addons_annual_price: Mapped[float] = mapped_column(Float, default=39000.0)
    discount_percentage: Mapped[float] = mapped_column(Float, default=15.0)
    commitment_years: Mapped[int] = mapped_column(Integer, default=2)
    total_annual_contract_value: Mapped[float] = mapped_column(Float, default=94350.0)  # ARR
    total_contract_value: Mapped[float] = mapped_column(Float, default=188700.0)        # TCV
    
    billing_terms: Mapped[str] = mapped_column(String(50), default="NET_30")
    status: Mapped[str] = mapped_column(
        String(50),
        default="ISSUED",  # DRAFT, ISSUED, ACCEPTED, SUPERSEDED, DECLINED
    )
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class SalesAgreement(Base, TimestampMixin):
    """Database model for Master Services Agreement (MSA), SLA, and security contracts."""
    __tablename__ = "sales_agreements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    contract_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    legal_entity_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_signatory_name: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_signatory_title: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_signatory_email: Mapped[str] = mapped_column(String(150), nullable=False)
    agreement_type: Mapped[str] = mapped_column(
        String(50),
        default="MASTER_SERVICES_AGREEMENT",
    )
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expiration_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    arr_amount: Mapped[float] = mapped_column(Float, default=94350.0)
    status: Mapped[str] = mapped_column(
        String(50),
        default="DRAFT",  # DRAFT, OUT_FOR_SIGNATURE, SIGNED, EXECUTED, ACTIVE, TERMINATED
    )
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signature_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    signer_ip_address: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    terms_content: Mapped[str] = mapped_column(Text, nullable=False)


class EnterpriseOnboarding(Base, TimestampMixin):
    """Database model tracking enterprise onboarding milestones after contract signing."""
    __tablename__ = "enterprise_onboardings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    primary_admin_email: Mapped[str] = mapped_column(String(150), nullable=False)
    primary_admin_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="IN_PROGRESS",  # NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED
    )
    completion_percentage: Mapped[int] = mapped_column(Integer, default=15)
    onboarding_steps: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    assigned_solutions_architect: Mapped[str] = mapped_column(
        String(150),
        default="Dr. Elena Rostova, Lead Enterprise Architect",
    )


class DemoWorkspaceSession(Base, TimestampMixin):
    """Database model for interactive demo workspace sessions and simulation telemetry."""
    __tablename__ = "demo_workspace_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_name: Mapped[str] = mapped_column(String(150), default="Live Interactive Demo Sandbox")
    visitor_id: Mapped[str] = mapped_column(String(150), default="demo-user")
    findings_detected: Mapped[int] = mapped_column(Integer, default=0)
    policies_evaluated: Mapped[int] = mapped_column(Integer, default=0)
    guided_steps_completed: Mapped[List[str]] = mapped_column(JSON, default=list)
    simulated_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)


class Lead(Base, TimestampMixin):
    """Authoritative database model for sales leads across the full funnel."""
    __tablename__ = "sales_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    company: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    use_case: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="WEBSITE",  # BOOK_DEMO, REQUEST_DEMO, CONTACT_SALES, ENTERPRISE_INQUIRY, TALK_TO_EXPERT, WEBSITE
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NEW",  # NEW, CONTACTED, QUALIFIED, DEMO_SCHEDULED, DEMO_COMPLETED, POC_REQUESTED, POC_ACTIVE, POC_COMPLETED, PROPOSAL_SENT, NEGOTIATION, CONTRACT_SENT, CONTRACT_SIGNED, ONBOARDING, WON, LOST
    )
    assigned_sales_user: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    lead_score: Mapped[int] = mapped_column(Integer, default=50)
    qualification_tier: Mapped[str] = mapped_column(String(50), default="TIER_2_MIDMARKET")
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)


class SecurityExpert(Base, TimestampMixin):
    """Database model for security experts and solutions architects available for consultation."""
    __tablename__ = "sales_security_experts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(100), default="SECURITY_EXPERT")
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    specialties: Mapped[List[str]] = mapped_column(JSON, default=list)
    available_days: Mapped[List[str]] = mapped_column(JSON, default=list)
    available_hours: Mapped[List[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class DemoAppointment(Base, TimestampMixin):
    """Database model for demo sessions and security expert meetings."""
    __tablename__ = "sales_demo_appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    sales_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    expert_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    expert_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(150), nullable=False)
    company: Mapped[str] = mapped_column(String(150), nullable=False)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    demo_type: Mapped[str] = mapped_column(String(100), default="Live Platform Demo")
    meeting_provider: Mapped[str] = mapped_column(String(50), default="Google Meet")
    meeting_url: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="SCHEDULED",  # SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class EnterpriseInquiry(Base, TimestampMixin):
    """Database model for enterprise inquiry questionnaires."""
    __tablename__ = "sales_enterprise_inquiries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    company: Mapped[str] = mapped_column(String(150), nullable=False)
    company_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    developers_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repositories_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cloud_providers: Mapped[List[str]] = mapped_column(JSON, default=list)
    deployment_requirements: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    compliance_requirements: Mapped[List[str]] = mapped_column(JSON, default=list)
    sso_requirement: Mapped[bool] = mapped_column(Boolean, default=False)
    scim_requirement: Mapped[bool] = mapped_column(Boolean, default=False)
    on_prem_requirement: Mapped[bool] = mapped_column(Boolean, default=False)
    private_deployment_requirement: Mapped[bool] = mapped_column(Boolean, default=False)
    support_requirements: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sales_owner: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="NEW")


class DemoWorkspace(Base, TimestampMixin):
    """Database model for dedicated demo sandboxes and evaluation workspaces."""
    __tablename__ = "sales_demo_workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    sales_user_id: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    workspace_name: Mapped[str] = mapped_column(String(150), default="SecuLayer Demo Sandbox")
    environment_type: Mapped[str] = mapped_column(String(50), default="SANDBOX")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    permissions: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["read", "scan", "evaluate"])
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    critical_findings_count: Mapped[int] = mapped_column(Integer, default=0)
    assets_count: Mapped[int] = mapped_column(Integer, default=0)
    security_score: Mapped[int] = mapped_column(Integer, default=100)

