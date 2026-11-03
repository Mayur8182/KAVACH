"""add_step28_network_security

Revision ID: 20261004_0030
Revises: 20260930_0029
Create Date: 2026-10-04

Adds THING Network Security tables:
  networks, network_assets, network_interfaces, ip_addresses, subnets, route_tables,
  routes, security_groups, security_group_rules, network_acls, network_acl_rules,
  firewalls, firewall_rules, load_balancers, gateways, network_endpoints, network_services,
  network_flows, network_policies, network_policy_rules, network_exposures, network_paths,
  network_segments, network_observations, network_evidence, network_risk_assessments, network_jobs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261004_0030"
down_revision = "20260930_0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Helper to create common columns
    def common_cols():
        return [
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True),
            sa.Column("environment_id", sa.String(50), nullable=False, server_default="production", index=True),
            sa.Column("provider", sa.String(50), nullable=False, index=True),
            sa.Column("provider_resource_id", sa.String(500), nullable=False, index=True),
            sa.Column("status", sa.String(50), nullable=False, server_default="ACTIVE", index=True),
            sa.Column("state", sa.String(50), nullable=False, server_default="OBSERVED"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("first_observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("last_observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
            sa.Column("metadata", sa.JSON(), server_default="{}", nullable=True),
        ]

    # 1. networks
    op.create_table(
        "networks",
        *common_cols(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("cidr_block", sa.String(100), nullable=True),
        sa.Column("secondary_cidrs", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("region", sa.String(100), nullable=True, index=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("vpc_peering_ids", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("dns_support", sa.Boolean(), server_default="true", nullable=False),
    )

    # 2. network_assets
    op.create_table(
        "network_assets",
        *common_cols(),
        sa.Column("asset_id", sa.String(255), nullable=False, index=True),
        sa.Column("asset_type", sa.String(100), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("subnet_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("private_addresses", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("public_addresses", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("criticality", sa.String(50), server_default="MEDIUM", nullable=False),
    )

    # 3. network_interfaces
    op.create_table(
        "network_interfaces",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("subnet_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("mac_address", sa.String(100), nullable=True),
        sa.Column("private_ip", sa.String(100), nullable=True),
        sa.Column("public_ip", sa.String(100), nullable=True),
        sa.Column("security_group_ids", sa.JSON(), server_default="[]", nullable=True),
    )

    # 4. ip_addresses
    op.create_table(
        "ip_addresses",
        *common_cols(),
        sa.Column("ip_address", sa.String(100), nullable=False, index=True),
        sa.Column("ip_version", sa.String(10), server_default="IPv4", nullable=False),
        sa.Column("address_type", sa.String(50), server_default="PRIVATE", nullable=False),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("subnet_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("interface_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("associated_resource_id", sa.String(255), nullable=True),
        sa.Column("is_exposed", sa.Boolean(), server_default="false", nullable=False, index=True),
    )

    # 5. subnets
    op.create_table(
        "subnets",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("cidr_block", sa.String(100), nullable=False),
        sa.Column("availability_zone", sa.String(100), nullable=True),
        sa.Column("route_table_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("network_acl_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False, index=True),
    )

    # 6. route_tables
    op.create_table(
        "route_tables",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_main", sa.Boolean(), server_default="false", nullable=False),
    )

    # 7. routes
    op.create_table(
        "routes",
        *common_cols(),
        sa.Column("route_table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("route_tables.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("destination_cidr", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(100), nullable=False),
        sa.Column("target_id", sa.String(255), nullable=False),
    )

    # 8. security_groups
    op.create_table(
        "security_groups",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("group_name", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
    )

    # 9. security_group_rules
    op.create_table(
        "security_group_rules",
        *common_cols(),
        sa.Column("security_group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("direction", sa.String(20), nullable=False, index=True),
        sa.Column("protocol", sa.String(50), nullable=False),
        sa.Column("from_port", sa.Integer(), nullable=True),
        sa.Column("to_port", sa.Integer(), nullable=True),
        sa.Column("port_range", sa.String(100), nullable=True),
        sa.Column("cidr_ipv4", sa.String(100), nullable=True, index=True),
        sa.Column("cidr_ipv6", sa.String(100), nullable=True),
        sa.Column("referenced_group_id", sa.String(255), nullable=True),
        sa.Column("action", sa.String(20), server_default="ALLOW", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("effective_state", sa.String(50), server_default="EFFECTIVE", nullable=False),
        sa.Column("is_wide_cidr", sa.Boolean(), server_default="false", nullable=False, index=True),
    )

    # 10. network_acls
    op.create_table(
        "network_acls",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("networks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
    )

    # 11. network_acl_rules
    op.create_table(
        "network_acl_rules",
        *common_cols(),
        sa.Column("network_acl_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("network_acls.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("rule_number", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("protocol", sa.String(50), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("cidr_block", sa.String(100), nullable=False),
        sa.Column("port_range", sa.String(100), nullable=True),
    )

    # 12. firewalls
    op.create_table(
        "firewalls",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("firewall_type", sa.String(100), nullable=False),
    )

    # 13. firewall_rules
    op.create_table(
        "firewall_rules",
        *common_cols(),
        sa.Column("firewall_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("firewalls.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("rule_name", sa.String(255), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="1000", nullable=False),
        sa.Column("source_ranges", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("destination_ranges", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("protocols", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("ports", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("effective_state", sa.String(50), server_default="EFFECTIVE", nullable=False),
    )

    # 14. load_balancers
    op.create_table(
        "load_balancers",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("dns_name", sa.String(500), nullable=True),
        sa.Column("scheme", sa.String(50), server_default="INTERNAL", nullable=False),
        sa.Column("lb_type", sa.String(50), server_default="APPLICATION", nullable=False),
        sa.Column("listeners", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("target_groups", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("subnets", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("security_groups", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default="false", nullable=False, index=True),
    )

    # 15. gateways
    op.create_table(
        "gateways",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("gateway_type", sa.String(100), nullable=False),
        sa.Column("attached_vpc_id", sa.String(255), nullable=True),
    )

    # 16. network_endpoints
    op.create_table(
        "network_endpoints",
        *common_cols(),
        sa.Column("network_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("service_name", sa.String(255), nullable=False),
        sa.Column("endpoint_type", sa.String(100), server_default="INTERFACE", nullable=False),
        sa.Column("dns_entries", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("ip_addresses", sa.JSON(), server_default="[]", nullable=True),
    )

    # 17. network_services
    op.create_table(
        "network_services",
        *common_cols(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("service_type", sa.String(100), server_default="CLUSTER_IP", nullable=False),
        sa.Column("namespace", sa.String(100), nullable=True),
        sa.Column("cluster_id", sa.String(255), nullable=True),
        sa.Column("ports", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("selector", sa.JSON(), server_default="{}", nullable=True),
        sa.Column("endpoints", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("is_exposed", sa.Boolean(), server_default="false", nullable=False, index=True),
    )

    # 18. network_flows
    op.create_table(
        "network_flows",
        *common_cols(),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column("source_ip", sa.String(100), nullable=False, index=True),
        sa.Column("destination_ip", sa.String(100), nullable=False, index=True),
        sa.Column("source_port", sa.Integer(), nullable=True),
        sa.Column("destination_port", sa.Integer(), nullable=True, index=True),
        sa.Column("protocol", sa.String(20), nullable=False),
        sa.Column("bytes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("packets", sa.Integer(), server_default="0", nullable=False),
        sa.Column("direction", sa.String(20), server_default="INGRESS", nullable=False),
        sa.Column("action", sa.String(20), server_default="ACCEPT", nullable=False),
        sa.Column("workload", sa.String(255), nullable=True),
        sa.Column("service", sa.String(255), nullable=True),
        sa.Column("identity", sa.String(255), nullable=True),
        sa.Column("source_type", sa.String(100), server_default="VPC_FLOW_LOG", nullable=False),
        sa.Column("trace_id", sa.String(255), nullable=True),
        sa.Column("correlation_state", sa.String(50), server_default="CORRELATION_UNAVAILABLE", nullable=False),
        sa.Column("correlated_asset_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # 19. network_policies
    op.create_table(
        "network_policies",
        *common_cols(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("is_immutable", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("approval_id", sa.String(255), nullable=True),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_until", sa.DateTime(timezone=True), nullable=True),
    )

    # 20. network_policy_rules
    op.create_table(
        "network_policy_rules",
        *common_cols(),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("network_policies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("destination", sa.String(255), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("protocol", sa.String(50), server_default="tcp", nullable=False),
        sa.Column("port", sa.String(50), nullable=True),
        sa.Column("priority", sa.Integer(), server_default="100", nullable=False),
        sa.Column("conditions", sa.JSON(), server_default="{}", nullable=True),
    )

    # 21. network_exposures
    op.create_table(
        "network_exposures",
        *common_cols(),
        sa.Column("exposure_category", sa.String(100), nullable=False, index=True),
        sa.Column("severity", sa.String(20), nullable=False, index=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("asset_name", sa.String(255), nullable=False),
        sa.Column("protocol", sa.String(50), nullable=True),
        sa.Column("port_range", sa.String(100), nullable=True),
        sa.Column("cidr", sa.String(100), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("remediation_advice", sa.Text(), nullable=True),
        sa.Column("evidence_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # 22. network_paths
    op.create_table(
        "network_paths",
        *common_cols(),
        sa.Column("source_asset_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("destination_asset_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("source_name", sa.String(255), nullable=False),
        sa.Column("destination_name", sa.String(255), nullable=False),
        sa.Column("hops", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("protocols", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("ports", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("allowed_edges", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("blocked_edges", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("verification_state", sa.String(50), server_default="THEORETICAL", nullable=False, index=True),
        sa.Column("evidence_ids", sa.JSON(), server_default="[]", nullable=True),
    )

    # 23. network_segments
    op.create_table(
        "network_segments",
        *common_cols(),
        sa.Column("segment_name", sa.String(255), nullable=False),
        sa.Column("boundary_type", sa.String(100), nullable=False),
        sa.Column("source_scope", sa.String(100), nullable=False),
        sa.Column("target_scope", sa.String(100), nullable=False),
        sa.Column("is_isolated", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("isolation_status", sa.String(50), server_default="ENFORCED", nullable=False, index=True),
        sa.Column("allowed_exceptions", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("violation_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("evidence_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # 24. network_observations
    op.create_table(
        "network_observations",
        *common_cols(),
        sa.Column("observation_type", sa.String(100), nullable=False, index=True),
        sa.Column("observed_value", sa.JSON(), server_default="{}", nullable=True),
        sa.Column("expected_value", sa.JSON(), server_default="{}", nullable=True),
        sa.Column("severity", sa.String(50), server_default="INFO", nullable=False),
        sa.Column("confidence", sa.Float(), server_default="1.0", nullable=False),
        sa.Column("observed_from", sa.String(255), nullable=False),
        sa.Column("evidence_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # 25. network_evidence
    op.create_table(
        "network_evidence",
        *common_cols(),
        sa.Column("source_type", sa.String(100), nullable=False, index=True),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("rule_id", sa.String(255), nullable=True),
        sa.Column("input_payload", sa.JSON(), server_default="{}", nullable=True),
        sa.Column("result_payload", sa.JSON(), server_default="{}", nullable=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("trace_id", sa.String(255), nullable=True),
        sa.Column("observation_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("collection_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 26. network_risk_assessments
    op.create_table(
        "network_risk_assessments",
        *common_cols(),
        sa.Column("risk_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("risk_level", sa.String(50), server_default="CLEAN", nullable=False),
        sa.Column("risk_factors", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("evidence_ids", sa.JSON(), server_default="[]", nullable=True),
        sa.Column("calculation_version", sa.String(50), server_default="1.0.0", nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 27. network_jobs
    op.create_table(
        "network_jobs",
        *common_cols(),
        sa.Column("job_type", sa.String(100), server_default="DISCOVERY", nullable=False),
        sa.Column("milestone", sa.String(100), server_default="QUEUED", nullable=False),
        sa.Column("progress_percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("trace_id", sa.String(255), nullable=True),
        sa.Column("job_metadata", sa.JSON(), server_default="{}", nullable=True),
    )


def downgrade() -> None:
    tables = [
        "network_jobs",
        "network_risk_assessments",
        "network_evidence",
        "network_observations",
        "network_segments",
        "network_paths",
        "network_exposures",
        "network_policy_rules",
        "network_policies",
        "network_flows",
        "network_services",
        "network_endpoints",
        "gateways",
        "load_balancers",
        "firewall_rules",
        "firewalls",
        "network_acl_rules",
        "network_acls",
        "security_group_rules",
        "security_groups",
        "routes",
        "route_tables",
        "subnets",
        "ip_addresses",
        "network_interfaces",
        "network_assets",
        "networks",
    ]
    for tbl in tables:
        op.drop_table(tbl)
