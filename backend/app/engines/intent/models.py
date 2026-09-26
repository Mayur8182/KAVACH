from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ApplicationTypeEnum(str, Enum):
    """Controlled vocabulary of application architectural archetypes."""
    WEB_APPLICATION = "WEB_APPLICATION"
    REST_API = "REST_API"
    GRAPHQL_API = "GRAPHQL_API"
    MOBILE_BACKEND = "MOBILE_BACKEND"
    CLI_APPLICATION = "CLI_APPLICATION"
    DATA_PIPELINE = "DATA_PIPELINE"
    ML_SERVICE = "ML_SERVICE"
    AI_AGENT = "AI_AGENT"
    AI_AGENT_PLATFORM = "AI_AGENT_PLATFORM"
    PAYMENT_API = "PAYMENT_API"
    AUTHENTICATION_SERVICE = "AUTHENTICATION_SERVICE"
    ADMIN_DASHBOARD = "ADMIN_DASHBOARD"
    E_COMMERCE = "E_COMMERCE"
    SAAS_PLATFORM = "SAAS_PLATFORM"
    INTERNAL_TOOL = "INTERNAL_TOOL"
    MICROSERVICE = "MICROSERVICE"
    EVENT_PROCESSING_SERVICE = "EVENT_PROCESSING_SERVICE"
    INFRASTRUCTURE_PLATFORM = "INFRASTRUCTURE_PLATFORM"
    UNKNOWN = "UNKNOWN"


class Actor(BaseModel):
    """An identity or entity interacting with the application."""
    id: str
    name: str
    type: str = Field(description="USER, CUSTOMER, ADMIN, OPERATOR, DEVELOPER, SERVICE, AI_AGENT, EXTERNAL_SERVICE, WEBHOOK_PROVIDER, SYSTEM")
    description: str
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class Workflow(BaseModel):
    """A business or operational execution sequence."""
    name: str
    description: str
    actors: List[str] = Field(default_factory=list)
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)
    state_changes: List[str] = Field(default_factory=list)
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class Interface(BaseModel):
    """An exposure point or communication mechanism."""
    type: str = Field(description="REST_API, GRAPHQL, WEBHOOK, MESSAGE_QUEUE, CLI, WEB_UI, MCP_TOOL, GRPC, DATABASE_INTERFACE")
    description: str
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class Technology(BaseModel):
    """A declared technology, language, framework, database, or tool."""
    name: str
    category: str = Field(description="LANGUAGE, FRAMEWORK, DATABASE, CLOUD, EXTERNAL_SERVICE, CONTAINER, CI_CD, TOOL")
    version: Optional[str] = Field(default=None, description="Exact declared version or null if not specified (never assumed)")
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class DataDomain(BaseModel):
    """A category of information handled by the application."""
    domain: str = Field(description="PUBLIC_DATA, USER_DATA, ACCOUNT_DATA, AUTHENTICATION_DATA, PAYMENT_DATA, FINANCIAL_DATA, PERSONAL_DATA, HEALTH_DATA, SOURCE_CODE, SECRETS, CREDENTIALS, INFRASTRUCTURE_DATA, LOG_DATA, AI_PROMPTS, AI_RESPONSES, BUSINESS_DATA, UNKNOWN")
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str = "USER_INPUT"


class ExternalService(BaseModel):
    """An external platform or third-party service integration."""
    name: str
    type: str
    purpose: str
    direction: str = Field(default="BIDIRECTIONAL", description="INBOUND, OUTBOUND, BIDIRECTIONAL")
    status: str = Field(default="INTENDED_INTEGRATION", description="INTENDED_INTEGRATION (not verified/connected yet)")
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class DeploymentContext(BaseModel):
    """Deployment target and infrastructure environment."""
    cloud_provider: Optional[str] = None
    environment: str = Field(default="development", description="LOCAL, DEVELOPMENT, STAGING, PRODUCTION, CLOUD, ON_PREMISE, HYBRID, UNKNOWN")
    source: str = "USER_INPUT"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class StateChange(BaseModel):
    """A business operation that mutates important state."""
    name: str
    target_entity: str
    description: str
    source: str = "USER_INPUT"
    confidence: float = Field(ge=0.0, le=1.0)


class TrustBoundary(BaseModel):
    """Architectural perimeter dividing components of different privilege levels."""
    source: str
    destination: str
    boundary_type: str
    description: str


class Ambiguity(BaseModel):
    """Incomplete, underspecified, or ambiguous developer specification."""
    question: str
    field: str
    rationale: str
    severity: str = "INFO"


class Evidence(BaseModel):
    """Direct ground-truth proof linking an extracted fact to its source."""
    field: str
    evidence_text: str
    source: str = "USER_INPUT"


class NormalizedIntent(BaseModel):
    """
    Complete, validated, and normalized representation of application intent.
    Preserves raw input and provides structured architectural facts for the Blueprint Engine.
    """
    model_config = ConfigDict(from_attributes=True)

    raw_input: str = Field(description="Exact unmodified raw developer input")
    purpose: str = Field(description="High-level operational purpose of application")
    application_type: str = Field(default="UNKNOWN", description="Architectural classification")
    actors: List[Actor] = Field(default_factory=list)
    workflows: List[Workflow] = Field(default_factory=list)
    interfaces: List[Interface] = Field(default_factory=list)
    technologies: List[Technology] = Field(default_factory=list)
    data_domains: List[DataDomain] = Field(default_factory=list)
    external_services: List[ExternalService] = Field(default_factory=list)
    deployment_context: DeploymentContext
    state_changes: List[StateChange] = Field(default_factory=list)
    trust_boundaries: List[TrustBoundary] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    ambiguities: List[Ambiguity] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    overall_confidence: float = Field(ge=0.0, le=1.0, description="Confidence in intent extraction (NOT a risk or security score)")
