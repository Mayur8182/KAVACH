import re
import uuid
from typing import Any, Dict, List, Optional

from app.engines.intent.models import (
    Actor,
    Ambiguity,
    ApplicationTypeEnum,
    DataDomain,
    DeploymentContext,
    Evidence,
    ExternalService,
    Interface,
    NormalizedIntent,
    StateChange,
    Technology,
    TrustBoundary,
    Workflow,
)
from app.engines.intent.providers.base import IntentModelProvider


class DeterministicIntentProvider(IntentModelProvider):
    """
    Deterministic rule-based intent analyzer.
    Extracts structured technical characteristics, entities, interfaces, and detects ambiguities
    without relying on external network dependencies.
    """

    @property
    def provider_name(self) -> str:
        return "deterministic-analyzer"

    @property
    def model_name(self) -> str:
        return "rule-engine-v1"

    async def is_available(self) -> bool:
        return True

    async def analyze(
        self,
        raw_input: str,
        project_context: Optional[Dict[str, Any]] = None,
    ) -> NormalizedIntent:
        text = raw_input.strip()
        lower = text.lower()
        context = project_context or {}

        evidence_list: List[Evidence] = []
        technologies: List[Technology] = []
        actors: List[Actor] = []
        workflows: List[Workflow] = []
        interfaces: List[Interface] = []
        data_domains: List[DataDomain] = []
        external_services: List[ExternalService] = []
        state_changes: List[StateChange] = []
        trust_boundaries: List[TrustBoundary] = []
        ambiguities: List[Ambiguity] = []
        missing_info: List[str] = []
        assumptions: List[str] = []

        # 1. Classify Application Type
        app_type = ApplicationTypeEnum.UNKNOWN.value
        confidence = 0.85

        if any(w in lower for w in ["payment", "stripe", "checkout", "billing", "invoice"]):
            app_type = ApplicationTypeEnum.PAYMENT_API.value
            confidence = 0.95
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of payment / billing / Stripe", source="USER_INPUT"))
        elif any(w in lower for w in ["auth", "login", "identity", "sso", "oauth"]):
            app_type = ApplicationTypeEnum.AUTHENTICATION_SERVICE.value
            confidence = 0.90
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of authentication / identity", source="USER_INPUT"))
        elif any(w in lower for w in ["agent", "autonomous", "mcp"]):
            app_type = ApplicationTypeEnum.AI_AGENT.value
            confidence = 0.90
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of AI agent", source="USER_INPUT"))
        elif any(w in lower for w in ["dashboard", "admin", "console"]):
            app_type = ApplicationTypeEnum.ADMIN_DASHBOARD.value
            confidence = 0.88
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of dashboard / admin", source="USER_INPUT"))
        elif any(w in lower for w in ["graphql"]):
            app_type = ApplicationTypeEnum.GRAPHQL_API.value
            confidence = 0.92
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of GraphQL", source="USER_INPUT"))
        elif any(w in lower for w in ["api", "rest", "endpoint", "microservice", "service"]):
            app_type = ApplicationTypeEnum.REST_API.value
            confidence = 0.88
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of API / REST", source="USER_INPUT"))
        elif any(w in lower for w in ["web", "website", "frontend", "ui"]):
            app_type = ApplicationTypeEnum.WEB_APPLICATION.value
            confidence = 0.85
            evidence_list.append(Evidence(field="application_type", evidence_text="Mention of web application", source="USER_INPUT"))

        # Purpose extraction
        purpose = f"Application providing {app_type.replace('_', ' ').lower()} functionality based on developer specification."

        # 2. Extract Technologies (Languages, Frameworks, DBs, Cloud)
        tech_catalog = [
            ("python", "Python", "LANGUAGE"),
            ("fastapi", "FastAPI", "FRAMEWORK"),
            ("flask", "Flask", "FRAMEWORK"),
            ("django", "Django", "FRAMEWORK"),
            ("nodejs", "Node.js", "LANGUAGE"),
            ("node.js", "Node.js", "LANGUAGE"),
            ("typescript", "TypeScript", "LANGUAGE"),
            ("javascript", "JavaScript", "LANGUAGE"),
            ("react", "React", "FRAMEWORK"),
            ("next.js", "Next.js", "FRAMEWORK"),
            ("nextjs", "Next.js", "FRAMEWORK"),
            ("postgresql", "PostgreSQL", "DATABASE"),
            ("postgres", "PostgreSQL", "DATABASE"),
            ("mysql", "MySQL", "DATABASE"),
            ("sqlite", "SQLite", "DATABASE"),
            ("redis", "Redis", "DATABASE"),
            ("mongodb", "MongoDB", "DATABASE"),
            ("docker", "Docker", "CONTAINER"),
            ("kubernetes", "Kubernetes", "CONTAINER"),
            ("k8s", "Kubernetes", "CONTAINER"),
            ("aws", "AWS", "CLOUD"),
            ("gcp", "GCP", "CLOUD"),
            ("azure", "Azure", "CLOUD"),
            ("stripe", "Stripe", "EXTERNAL_SERVICE"),
            ("github", "GitHub", "CI_CD"),
        ]

        seen_tech = set()
        for kw, name, cat in tech_catalog:
            if kw in lower and name not in seen_tech:
                seen_tech.add(name)
                technologies.append(Technology(
                    name=name,
                    category=cat,
                    version=None,  # Never invent versions!
                    source="USER_INPUT",
                    confidence=0.95,
                ))
                evidence_list.append(Evidence(field="technologies", evidence_text=kw, source="USER_INPUT"))

        # 3. Interfaces
        if "webhook" in lower:
            interfaces.append(Interface(
                type="WEBHOOK",
                description="Receives external event notifications via HTTP webhook callbacks",
                source="USER_INPUT",
                confidence=0.95,
            ))
        if any(w in lower for w in ["api", "rest", "fastapi", "endpoint", "http", "crud"]):
            interfaces.append(Interface(
                type="REST_API",
                description="Exposes HTTP REST JSON endpoints for client consumption",
                source="USER_INPUT",
                confidence=0.95,
            ))
        if any(w in lower for w in ["graphql"]):
            interfaces.append(Interface(
                type="GRAPHQL",
                description="Exposes GraphQL query and mutation interface",
                source="USER_INPUT",
                confidence=0.95,
            ))

        # Default interface if none detected
        if not interfaces:
            interfaces.append(Interface(
                type="REST_API",
                description="Inferred default HTTP interface for service",
                source="INFERRED",
                confidence=0.60,
            ))

        # 4. External Services
        if "stripe" in lower:
            external_services.append(ExternalService(
                name="Stripe",
                type="PAYMENT_GATEWAY",
                purpose="Payment processing and transaction settlement",
                direction="BIDIRECTIONAL",
                status="INTENDED_INTEGRATION",
                source="USER_INPUT",
                confidence=0.98,
            ))
            data_domains.append(DataDomain(
                domain="PAYMENT_DATA",
                description="Credit card tokens, checkout sessions, and transaction ledgers",
                confidence=0.95,
                source="USER_INPUT",
            ))
            actors.append(Actor(
                id="actor-stripe",
                name="Stripe Webhook Gateway",
                type="EXTERNAL_SERVICE",
                description="External payment provider transmitting transaction events",
                source="USER_INPUT",
                confidence=0.95,
            ))
            workflows.append(Workflow(
                name="PAYMENT_WEBHOOK_PROCESSING",
                description="Receives and processes asynchronous webhook callbacks from payment processor",
                actors=["Stripe Webhook Gateway"],
                inputs=["Webhook event payload"],
                outputs=["Order status confirmation"],
                state_changes=["UPDATE_PAYMENT_STATUS"],
                source="USER_INPUT",
                confidence=0.92,
            ))
            state_changes.append(StateChange(
                name="UPDATE_PAYMENT_STATUS",
                target_entity="PaymentTransaction",
                description="Updates payment transaction state upon webhook verification",
                source="USER_INPUT",
                confidence=0.90,
            ))

        # 5. Actors & Core Workflows
        actors.append(Actor(
            id="actor-client-user",
            name="End User / Customer",
            type="CUSTOMER" if app_type == ApplicationTypeEnum.PAYMENT_API.value else "USER",
            description="Client interacting with the application endpoints",
            source="USER_INPUT",
            confidence=0.90,
        ))

        if app_type == ApplicationTypeEnum.PAYMENT_API.value or "create payment" in lower:
            workflows.append(Workflow(
                name="CREATE_PAYMENT",
                description="Customer initiates payment request for goods or services",
                actors=["End User / Customer"],
                inputs=["Payment amount", "Currency", "Customer details"],
                outputs=["Payment intent response", "Checkout URL"],
                state_changes=["CREATE_PAYMENT_RECORD"],
                source="USER_INPUT",
                confidence=0.95,
            ))
            state_changes.append(StateChange(
                name="CREATE_PAYMENT_RECORD",
                target_entity="PaymentIntent",
                description="Creates new payment transaction in database",
                source="USER_INPUT",
                confidence=0.95,
            ))

        # Default User Data domain
        data_domains.append(DataDomain(
            domain="USER_DATA",
            description="User profile, credentials, and interaction metadata",
            confidence=0.85,
            source="USER_INPUT",
        ))

        # 6. Deployment Context
        cloud_target = None
        for cloud in ["aws", "gcp", "azure"]:
            if cloud in lower:
                cloud_target = cloud.upper()
                break

        env_target = context.get("environment", "development").lower()
        if "production" in lower:
            env_target = "production"
        elif "staging" in lower:
            env_target = "staging"

        deployment = DeploymentContext(
            cloud_provider=cloud_target,
            environment=env_target,
            source="USER_INPUT" if cloud_target or ("production" in lower or "staging" in lower) else "PROJECT_CONTEXT",
            confidence=0.90 if cloud_target else 0.70,
        )

        # 7. Trust Boundaries
        trust_boundaries.append(TrustBoundary(
            source="Public Internet / Client",
            destination="Application Ingress (REST API)",
            boundary_type="UNTRUSTED_TO_TRUSTED",
            description="Perimeter between external untrusted clients and internal application services",
        ))
        if any(t.name in ["PostgreSQL", "MySQL", "SQLite", "Redis", "MongoDB"] for t in technologies):
            trust_boundaries.append(TrustBoundary(
                source="Application Backend",
                destination="Database Storage",
                boundary_type="APP_TO_DATA_STORE",
                description="Internal boundary isolating application business logic from persistent state stores",
            ))
        if external_services:
            trust_boundaries.append(TrustBoundary(
                source="Application Backend",
                destination="External Third-Party APIs",
                boundary_type="INTERNAL_TO_EXTERNAL_SERVICE",
                description="Egress boundary transmitting and receiving payloads from external platforms",
            ))

        # 8. Ambiguity & Missing Information Detection
        if not any(w in lower for w in ["auth", "jwt", "oauth", "login", "authenticate"]):
            ambiguities.append(Ambiguity(
                question="What authentication mechanism will protect client endpoints?",
                field="authentication",
                rationale="No authentication protocol (JWT, OAuth2, Session) was specified for client API requests.",
                severity="WARNING",
            ))
            missing_info.append("Authentication mechanism is unspecified.")

        if not any(t.category == "DATABASE" for t in technologies):
            ambiguities.append(Ambiguity(
                question="Which database engine should be used for data persistence?",
                field="database_type",
                rationale="Application requires persistence but no database technology was named.",
                severity="INFO",
            ))
            missing_info.append("Database engine is unspecified.")

        if cloud_target is None and env_target == "production":
            ambiguities.append(Ambiguity(
                question="Which cloud provider or hosting platform is intended for production?",
                field="cloud_provider",
                rationale="Production environment specified without cloud host (AWS, GCP, Azure, On-premise).",
                severity="INFO",
            ))
            missing_info.append("Cloud hosting provider is unspecified.")

        return NormalizedIntent(
            raw_input=raw_input,
            purpose=purpose,
            application_type=app_type,
            actors=actors,
            workflows=workflows,
            interfaces=interfaces,
            technologies=technologies,
            data_domains=data_domains,
            external_services=external_services,
            deployment_context=deployment,
            state_changes=state_changes,
            trust_boundaries=trust_boundaries,
            assumptions=assumptions,
            ambiguities=ambiguities,
            missing_information=missing_info,
            evidence=evidence_list,
            overall_confidence=confidence,
        )
