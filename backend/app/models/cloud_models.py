"""
Step 18 Cloud Security Integration Models.

Covers AWS, Azure, and GCP resources, IAM, networks, security checks, observations,
audit events, findings, actions, drift, and discovery jobs.

Rules:
- Immutable provider identity (Rule 37)
- No fake cloud resources (Rule 32)
- No stored raw cloud secrets (Rule 35)
- Provider failure isolation (Rule 44)
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Boolean,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class CloudConnection(Base):
    __tablename__ = "cloud_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # AWS, AZURE, GCP
    connection_name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="NOT_CONFIGURED", index=True)
    # NOT_CONFIGURED, CONNECTING, CONNECTED, AUTHENTICATION_FAILED,
    # AUTHORIZATION_FAILED, EXPIRED, THROTTLED, UNAVAILABLE, ERROR, DISCONNECTED
    authentication_method = Column(String, nullable=False)  # IAM_ROLE, STS, ASSUME_ROLE, MANAGED_IDENTITY, WORKLOAD_IDENTITY, SERVICE_ACCOUNT, ACCESS_KEY
    credential_reference = Column(String, nullable=True)  # Secure reference, never plaintext secret
    account_identifier = Column(String, nullable=True, index=True)  # AWS Account ID
    tenant_identifier = Column(String, nullable=True, index=True)   # Azure Tenant ID
    subscription_identifier = Column(String, nullable=True, index=True)  # Azure Subscription ID
    gcp_project_identifier = Column(String, nullable=True, index=True)   # GCP Project ID
    default_region = Column(String, nullable=True)
    permissions_mode = Column(String, nullable=False, default="READ_ONLY")  # READ_ONLY, CONTROLLED_WRITE
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    cloud_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CloudResource(Base):
    __tablename__ = "cloud_resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # AWS, AZURE, GCP
    resource_type = Column(String, nullable=False, index=True)
    provider_resource_id = Column(String, nullable=False, index=True)  # Immutable cloud identifier (ARN, resource ID, URI)
    resource_name = Column(String, nullable=False)
    resource_uri = Column(String, nullable=True, index=True)
    region = Column(String, nullable=True, index=True)
    zone = Column(String, nullable=True)
    account_id = Column(String, nullable=True, index=True)
    subscription_id = Column(String, nullable=True, index=True)
    gcp_project_id = Column(String, nullable=True, index=True)
    parent_resource_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    tags = Column(JSON, default=dict)
    labels = Column(JSON, default=dict)
    configuration = Column(JSON, default=dict)  # Sanitized configuration, NO SECRETS
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_cloud_res_provider_type", "provider", "resource_type"),
        Index("ix_cloud_res_account_region", "account_id", "region"),
        Index("idx_cloud_res_proj_disc_id", "project_id", "discovered_at", "id"),
        Index("idx_cloud_res_prov_disc_id", "provider", "discovered_at", "id"),
    )


class CloudResourceRelationship(Base):
    __tablename__ = "cloud_resource_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    target_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    relationship_type = Column(String, nullable=False, index=True)
    # ASSIGNED_TO, ASSUMES, CAN_ACCESS, TRUSTS, CONTAINS, ROUTES_TO, EXPOSES, PROTECTS, USES, DEPENDS_ON, DEPLOYED_TO, VERIFIED_BY
    provenance = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudSecurityObservation(Base):
    __tablename__ = "cloud_security_observations"
    __table_args__ = (
        Index("idx_cloud_obs_proj_sev_status", "project_id", "severity", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)
    observation_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status = Column(String, nullable=False, default="OPEN", index=True)  # OPEN, ACKNOWLEDGED, FALSE_POSITIVE, RESOLVED, SUPPRESSED, UNKNOWN
    source = Column(String, nullable=False)  # NATIVE_CHECK, SECURITY_HUB, DEFENDER, SCC, CONFIG
    rule_id = Column(String, nullable=False, index=True)
    configuration_path = Column(String, nullable=True)
    observed_value = Column(JSON, nullable=True)
    expected_value = Column(JSON, nullable=True)
    evidence_id = Column(String, nullable=True, index=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    observation_metadata = Column("metadata", JSON, default=dict)


class CloudSecurityRule(Base):
    __tablename__ = "cloud_security_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(String, nullable=False, unique=True, index=True)
    provider = Column(String, nullable=False, index=True)  # AWS, AZURE, GCP, MULTI_CLOUD
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True)  # IAM, STORAGE, NETWORK, COMPUTE, DATABASE, ENCRYPTION, AUDIT
    severity = Column(String, nullable=False)
    remediation_guidance = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CloudSecurityRuleVersion(Base):
    __tablename__ = "cloud_security_rule_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("cloud_security_rules.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    rule_definition = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudRequirementMapping(Base):
    __tablename__ = "cloud_requirement_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    security_requirement_id = Column(String, nullable=False, index=True)
    cloud_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    verification_strategy = Column(String, nullable=False)
    status = Column(String, nullable=False, default="NOT_VERIFIED", index=True)  # VERIFIED, VIOLATED, UNKNOWN, NOT_VERIFIED
    evidence_id = Column(String, nullable=True, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudIAMPrincipal(Base):
    __tablename__ = "cloud_iam_principals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    principal_type = Column(String, nullable=False)  # USER, ROLE, SERVICE_ACCOUNT, SERVICE_PRINCIPAL, GROUP
    provider_principal_id = Column(String, nullable=False, index=True)
    principal_name = Column(String, nullable=False)
    arn_or_uri = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, nullable=True)
    cloud_metadata = Column("metadata", JSON, default=dict)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudIAMRole(Base):
    __tablename__ = "cloud_iam_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    role_name = Column(String, nullable=False)
    provider_role_id = Column(String, nullable=False, index=True)
    arn_or_uri = Column(String, nullable=True)
    trust_policy = Column(JSON, default=dict)
    is_cross_account = Column(Boolean, default=False)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudIAMPolicy(Base):
    __tablename__ = "cloud_iam_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    policy_name = Column(String, nullable=False)
    provider_policy_id = Column(String, nullable=False, index=True)
    arn_or_uri = Column(String, nullable=True)
    is_custom = Column(Boolean, default=True)
    policy_document = Column(JSON, default=dict)
    has_wildcard_permission = Column(Boolean, default=False)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudIAMAssignment(Base):
    __tablename__ = "cloud_iam_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("cloud_iam_principals.id"), nullable=False, index=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("cloud_iam_roles.id"), nullable=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("cloud_iam_policies.id"), nullable=True)
    scope = Column(String, nullable=True)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudNetwork(Base):
    __tablename__ = "cloud_networks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    network_name = Column(String, nullable=False)
    provider_network_id = Column(String, nullable=False, index=True)  # VPC ID, VNet ID
    cidr_block = Column(String, nullable=True)
    region = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudSubnet(Base):
    __tablename__ = "cloud_subnets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    network_id = Column(UUID(as_uuid=True), ForeignKey("cloud_networks.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    subnet_name = Column(String, nullable=False)
    provider_subnet_id = Column(String, nullable=False, index=True)
    cidr_block = Column(String, nullable=True)
    availability_zone = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudFirewallRule(Base):
    __tablename__ = "cloud_firewall_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    rule_name = Column(String, nullable=False)
    provider_rule_id = Column(String, nullable=False, index=True)  # SG rule or NSG rule
    direction = Column(String, nullable=False)  # INBOUND, OUTBOUND
    action = Column(String, nullable=False)     # ALLOW, DENY
    protocol = Column(String, nullable=False)
    port_range = Column(String, nullable=True)
    source_cidr = Column(String, nullable=True)
    destination_cidr = Column(String, nullable=True)
    is_public_ingress = Column(Boolean, default=False, index=True)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudAuditEvent(Base):
    __tablename__ = "cloud_audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)  # AWS, AZURE, GCP
    event_id = Column(String, nullable=False, index=True)
    event_name = Column(String, nullable=False, index=True)
    event_source = Column(String, nullable=False)  # CLOUDTRAIL, ACTIVITY_LOG, AUDIT_LOG
    actor = Column(String, nullable=True, index=True)
    resource_id = Column(String, nullable=True, index=True)
    event_time = Column(DateTime(timezone=True), nullable=False, index=True)
    raw_event_reference = Column(String, nullable=True)
    correlation_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudProviderFinding(Base):
    __tablename__ = "cloud_provider_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)
    provider_finding_id = Column(String, nullable=False, index=True)
    source_service = Column(String, nullable=False)  # SECURITY_HUB, DEFENDER, SCC, CONFIG
    original_severity = Column(String, nullable=False)
    original_status = Column(String, nullable=False)
    resource_provider_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    first_observed = Column(DateTime(timezone=True), nullable=False)
    last_observed = Column(DateTime(timezone=True), nullable=False)
    finding_metadata = Column("metadata", JSON, default=dict)


class CloudAction(Base):
    __tablename__ = "cloud_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    delegation_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    provider = Column(String, nullable=False, index=True)
    action_type = Column(String, nullable=False, index=True)
    # RESTRICT_PUBLIC_ACCESS, REMOVE_SECURITY_GROUP_RULE, ROTATE_SECRET, ISOLATE_RESOURCE, PAUSE_DEPLOYMENT, REVOKE_PERMISSION
    resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    resource_scope = Column(String, nullable=False)
    environment = Column(String, nullable=False, default="PRODUCTION")
    authorization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    approval_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    status = Column(String, nullable=False, default="REQUESTED", index=True)
    # REQUESTED, PENDING_APPROVAL, AUTHORIZED, DENIED, QUEUED, EXECUTING, COMPLETED, FAILED, CANCELLED, EXPIRED, NOT_EXECUTED, PARTIALLY_COMPLETED
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
    result_reference = Column(String, nullable=True)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)


class CloudActionEvidence(Base):
    __tablename__ = "cloud_action_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_id = Column(UUID(as_uuid=True), ForeignKey("cloud_actions.id"), nullable=False, index=True)
    before_state = Column(JSON, nullable=False)
    after_state = Column(JSON, nullable=False)
    verification_status = Column(String, nullable=False)  # VERIFIED, FAILED, UNKNOWN
    evidence_payload = Column(JSON, default=dict)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudResourceDrift(Base):
    __tablename__ = "cloud_resource_drift"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=False, index=True)
    desired_state_source = Column(String, nullable=False)  # TERRAFORM, BLUEPRINT
    desired_configuration = Column(JSON, nullable=False)
    actual_configuration = Column(JSON, nullable=False)
    drifted_fields = Column(JSON, nullable=False)
    status = Column(String, nullable=False, default="DRIFT_DETECTED", index=True)  # DRIFT_DETECTED, RESOLVED, ACCEPTED
    change_actor = Column(String, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudDeployment(Base):
    __tablename__ = "cloud_deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cloud_connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    cloud_resource_id = Column(UUID(as_uuid=True), ForeignKey("cloud_resources.id"), nullable=True, index=True)
    commit_sha = Column(String, nullable=False, index=True)
    jenkins_build_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    docker_image_digest = Column(String, nullable=True, index=True)
    kubernetes_deployment_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    environment = Column(String, nullable=False, default="PRODUCTION")
    status = Column(String, nullable=False, default="QUEUED", index=True)
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    authorization_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    approval_id = Column(UUID(as_uuid=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudDiscoveryJob(Base):
    __tablename__ = "cloud_discovery_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    provider = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="QUEUED", index=True)
    # QUEUED, RUNNING, COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED
    resources_discovered = Column(Integer, default=0)
    resources_failed = Column(Integer, default=0)
    errors = Column(JSON, default=list)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CloudSecurityVerificationJob(Base):
    __tablename__ = "cloud_security_verification_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("cloud_connections.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="QUEUED", index=True)
    # QUEUED, RUNNING, COLLECTING_EVIDENCE, EVALUATING, COMPLETED, PARTIALLY_COMPLETED, FAILED
    resources_evaluated = Column(Integer, default=0)
    findings_detected = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
