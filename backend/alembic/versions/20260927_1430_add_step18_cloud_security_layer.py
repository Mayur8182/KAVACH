"""add_step18_cloud_security_layer

Revision ID: 20260927_1430
Revises: 20260927_1417
Create Date: 2026-09-27 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1430"
down_revision: Union[str, None] = "20260927_1417"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. cloud_connections
    op.create_table(
        "cloud_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("connection_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="NOT_CONFIGURED", index=True),
        sa.Column("authentication_method", sa.String(), nullable=False),
        sa.Column("credential_reference", sa.String(), nullable=True),
        sa.Column("account_identifier", sa.String(), nullable=True, index=True),
        sa.Column("tenant_identifier", sa.String(), nullable=True, index=True),
        sa.Column("subscription_identifier", sa.String(), nullable=True, index=True),
        sa.Column("gcp_project_identifier", sa.String(), nullable=True, index=True),
        sa.Column("default_region", sa.String(), nullable=True),
        sa.Column("permissions_mode", sa.String(), nullable=False, server_default="READ_ONLY"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 2. cloud_resources
    op.create_table(
        "cloud_resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("resource_type", sa.String(), nullable=False, index=True),
        sa.Column("provider_resource_id", sa.String(), nullable=False, index=True),
        sa.Column("resource_name", sa.String(), nullable=False),
        sa.Column("resource_uri", sa.String(), nullable=True, index=True),
        sa.Column("region", sa.String(), nullable=True, index=True),
        sa.Column("zone", sa.String(), nullable=True),
        sa.Column("account_id", sa.String(), nullable=True, index=True),
        sa.Column("subscription_id", sa.String(), nullable=True, index=True),
        sa.Column("gcp_project_id", sa.String(), nullable=True, index=True),
        sa.Column("parent_resource_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=True),
        sa.Column("configuration", sa.JSON(), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cloud_res_provider_type", "cloud_resources", ["provider", "resource_type"])
    op.create_index("ix_cloud_res_account_region", "cloud_resources", ["account_id", "region"])

    # 3. cloud_resource_relationships
    op.create_table(
        "cloud_resource_relationships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("target_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("relationship_type", sa.String(), nullable=False, index=True),
        sa.Column("provenance", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. cloud_security_observations
    op.create_table(
        "cloud_security_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("observation_type", sa.String(), nullable=False, index=True),
        sa.Column("severity", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN", index=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("rule_id", sa.String(), nullable=False, index=True),
        sa.Column("configuration_path", sa.String(), nullable=True),
        sa.Column("observed_value", sa.JSON(), nullable=True),
        sa.Column("expected_value", sa.JSON(), nullable=True),
        sa.Column("evidence_id", sa.String(), nullable=True, index=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )

    # 5. cloud_security_rules
    op.create_table(
        "cloud_security_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rule_id", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(), nullable=False, index=True),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("remediation_guidance", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 6. cloud_security_rule_versions
    op.create_table(
        "cloud_security_rule_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_security_rules.id"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("rule_definition", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 7. cloud_requirement_mappings
    op.create_table(
        "cloud_requirement_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("security_requirement_id", sa.String(), nullable=False, index=True),
        sa.Column("cloud_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("verification_strategy", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="NOT_VERIFIED", index=True),
        sa.Column("evidence_id", sa.String(), nullable=True, index=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 8. cloud_iam_principals
    op.create_table(
        "cloud_iam_principals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("principal_type", sa.String(), nullable=False),
        sa.Column("provider_principal_id", sa.String(), nullable=False, index=True),
        sa.Column("principal_name", sa.String(), nullable=False),
        sa.Column("arn_or_uri", sa.String(), nullable=True),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 9. cloud_iam_roles
    op.create_table(
        "cloud_iam_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("role_name", sa.String(), nullable=False),
        sa.Column("provider_role_id", sa.String(), nullable=False, index=True),
        sa.Column("arn_or_uri", sa.String(), nullable=True),
        sa.Column("trust_policy", sa.JSON(), nullable=True),
        sa.Column("is_cross_account", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 10. cloud_iam_policies
    op.create_table(
        "cloud_iam_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("policy_name", sa.String(), nullable=False),
        sa.Column("provider_policy_id", sa.String(), nullable=False, index=True),
        sa.Column("arn_or_uri", sa.String(), nullable=True),
        sa.Column("is_custom", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("policy_document", sa.JSON(), nullable=True),
        sa.Column("has_wildcard_permission", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 11. cloud_iam_assignments
    op.create_table(
        "cloud_iam_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("principal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_iam_principals.id"), nullable=False, index=True),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_iam_roles.id"), nullable=True),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_iam_policies.id"), nullable=True),
        sa.Column("scope", sa.String(), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 12. cloud_networks
    op.create_table(
        "cloud_networks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("network_name", sa.String(), nullable=False),
        sa.Column("provider_network_id", sa.String(), nullable=False, index=True),
        sa.Column("cidr_block", sa.String(), nullable=True),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 13. cloud_subnets
    op.create_table(
        "cloud_subnets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_networks.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("subnet_name", sa.String(), nullable=False),
        sa.Column("provider_subnet_id", sa.String(), nullable=False, index=True),
        sa.Column("cidr_block", sa.String(), nullable=True),
        sa.Column("availability_zone", sa.String(), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 14. cloud_firewall_rules
    op.create_table(
        "cloud_firewall_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("rule_name", sa.String(), nullable=False),
        sa.Column("provider_rule_id", sa.String(), nullable=False, index=True),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("protocol", sa.String(), nullable=False),
        sa.Column("port_range", sa.String(), nullable=True),
        sa.Column("source_cidr", sa.String(), nullable=True),
        sa.Column("destination_cidr", sa.String(), nullable=True),
        sa.Column("is_public_ingress", sa.Boolean(), server_default=sa.text("false"), index=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 15. cloud_audit_events
    op.create_table(
        "cloud_audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("event_id", sa.String(), nullable=False, index=True),
        sa.Column("event_name", sa.String(), nullable=False, index=True),
        sa.Column("event_source", sa.String(), nullable=False),
        sa.Column("actor", sa.String(), nullable=True, index=True),
        sa.Column("resource_id", sa.String(), nullable=True, index=True),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("raw_event_reference", sa.String(), nullable=True),
        sa.Column("correlation_id", sa.String(), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 16. cloud_provider_findings
    op.create_table(
        "cloud_provider_findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("provider_finding_id", sa.String(), nullable=False, index=True),
        sa.Column("source_service", sa.String(), nullable=False),
        sa.Column("original_severity", sa.String(), nullable=False),
        sa.Column("original_status", sa.String(), nullable=False),
        sa.Column("resource_provider_id", sa.String(), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("first_observed", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_observed", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )

    # 17. cloud_actions
    op.create_table(
        "cloud_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("delegation_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("action_type", sa.String(), nullable=False, index=True),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("resource_scope", sa.String(), nullable=False),
        sa.Column("environment", sa.String(), nullable=False, server_default="PRODUCTION"),
        sa.Column("authorization_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("policy_decision_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("approval_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="REQUESTED", index=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("result_reference", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=False, unique=True, index=True),
    )

    # 18. cloud_action_evidence
    op.create_table(
        "cloud_action_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("action_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_actions.id"), nullable=False, index=True),
        sa.Column("before_state", sa.JSON(), nullable=False),
        sa.Column("after_state", sa.JSON(), nullable=False),
        sa.Column("verification_status", sa.String(), nullable=False),
        sa.Column("evidence_payload", sa.JSON(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 19. cloud_resource_drift
    op.create_table(
        "cloud_resource_drift",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=False, index=True),
        sa.Column("desired_state_source", sa.String(), nullable=False),
        sa.Column("desired_configuration", sa.JSON(), nullable=False),
        sa.Column("actual_configuration", sa.JSON(), nullable=False),
        sa.Column("drifted_fields", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="DRIFT_DETECTED", index=True),
        sa.Column("change_actor", sa.String(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 20. cloud_deployments
    op.create_table(
        "cloud_deployments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("cloud_connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("cloud_resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_resources.id"), nullable=True, index=True),
        sa.Column("commit_sha", sa.String(), nullable=False, index=True),
        sa.Column("jenkins_build_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("docker_image_digest", sa.String(), nullable=True, index=True),
        sa.Column("kubernetes_deployment_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("environment", sa.String(), nullable=False, server_default="PRODUCTION"),
        sa.Column("status", sa.String(), nullable=False, server_default="QUEUED", index=True),
        sa.Column("policy_decision_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("authorization_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("approval_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 21. cloud_discovery_jobs
    op.create_table(
        "cloud_discovery_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="QUEUED", index=True),
        sa.Column("resources_discovered", sa.Integer(), server_default="0"),
        sa.Column("resources_failed", sa.Integer(), server_default="0"),
        sa.Column("errors", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 22. cloud_security_verification_jobs
    op.create_table(
        "cloud_security_verification_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cloud_connections.id"), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="QUEUED", index=True),
        sa.Column("resources_evaluated", sa.Integer(), server_default="0"),
        sa.Column("findings_detected", sa.Integer(), server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cloud_security_verification_jobs")
    op.drop_table("cloud_discovery_jobs")
    op.drop_table("cloud_deployments")
    op.drop_table("cloud_resource_drift")
    op.drop_table("cloud_action_evidence")
    op.drop_table("cloud_actions")
    op.drop_table("cloud_provider_findings")
    op.drop_table("cloud_audit_events")
    op.drop_table("cloud_firewall_rules")
    op.drop_table("cloud_subnets")
    op.drop_table("cloud_networks")
    op.drop_table("cloud_iam_assignments")
    op.drop_table("cloud_iam_policies")
    op.drop_table("cloud_iam_roles")
    op.drop_table("cloud_iam_principals")
    op.drop_table("cloud_requirement_mappings")
    op.drop_table("cloud_security_rule_versions")
    op.drop_table("cloud_security_rules")
    op.drop_table("cloud_security_observations")
    op.drop_table("cloud_resource_relationships")
    op.drop_table("cloud_resources")
    op.drop_table("cloud_connections")
