"""add_step25_dns_security

Revision ID: 20260927_1900
Revises: 20260927_1800
Create Date: 2026-09-27 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1900"
down_revision: Union[str, None] = "20260927_1800"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. dns_data_sources
    if "dns_data_sources" not in tables:
        op.create_table(
            "dns_data_sources",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("source_type", sa.String(64), nullable=False),
            sa.Column("provider", sa.String(64), nullable=False),
            sa.Column("endpoint", sa.String(512), nullable=False),
            sa.Column("authentication_type", sa.String(64), nullable=False, server_default="NONE"),
            sa.Column("configuration", sa.JSON(), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("status", sa.String(32), nullable=False, server_default="NOT_CONFIGURED"),
            sa.Column("status_reason", sa.Text(), nullable=True),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_success", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_failure", sa.DateTime(timezone=True), nullable=True),
            sa.Column("events_collected", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_data_sources_status", "dns_data_sources", ["status"])
        op.create_index("ix_dns_data_sources_type", "dns_data_sources", ["source_type"])

    # 2. dns_events
    if "dns_events" not in tables:
        op.create_table(
            "dns_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            sa.Column("query_name", sa.String(512), nullable=False),
            sa.Column("normalized_query", sa.String(512), nullable=False),
            sa.Column("query_type", sa.String(16), nullable=False, server_default="A"),
            sa.Column("response_code", sa.String(16), nullable=False, server_default="NOERROR"),
            sa.Column("answers", sa.JSON(), nullable=True),
            sa.Column("resolver", sa.String(255), nullable=True),
            sa.Column("resolver_ip", sa.String(64), nullable=True),
            sa.Column("protocol", sa.String(16), nullable=False, server_default="UDP"),
            sa.Column("source_type", sa.String(64), nullable=False, server_default="RESOLVER"),
            sa.Column("client_ip", sa.String(64), nullable=True),
            sa.Column("destination_ip", sa.String(64), nullable=True),
            sa.Column("client_identity", sa.String(255), nullable=True),
            sa.Column("user_identity", sa.String(255), nullable=True),
            sa.Column("agent_identity", sa.String(255), nullable=True),
            sa.Column("workload_identity", sa.String(255), nullable=True),
            sa.Column("container_id", sa.String(128), nullable=True),
            sa.Column("pod_id", sa.String(128), nullable=True),
            sa.Column("namespace", sa.String(128), nullable=True),
            sa.Column("cloud_resource_id", sa.String(255), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("environment", sa.String(64), nullable=False, server_default="PRODUCTION"),
            sa.Column("duration_ms", sa.Float(), nullable=True),
            sa.Column("raw_event_reference", sa.String(255), nullable=False),
            sa.Column("correlation_id", sa.String(128), nullable=True),
            sa.Column("threat_match_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("decision_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_events_norm_query_time", "dns_events", ["normalized_query", "timestamp"])
        op.create_index("ix_dns_events_agent_time", "dns_events", ["agent_identity", "timestamp"])
        op.create_index("ix_dns_events_proj_rcode", "dns_events", ["project_id", "response_code"])

    # 3. domains
    if "domains" not in tables:
        op.create_table(
            "domains",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("fqdn", sa.String(512), nullable=False, unique=True),
            sa.Column("registered_domain", sa.String(255), nullable=False),
            sa.Column("subdomain", sa.String(255), nullable=True),
            sa.Column("tld", sa.String(64), nullable=False),
            sa.Column("punycode", sa.String(512), nullable=True),
            sa.Column("is_idn", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("idn_classification", sa.String(32), nullable=False, server_default="NORMAL"),
            sa.Column("reputation", sa.String(32), nullable=False, server_default="UNKNOWN"),
            sa.Column("classification", sa.String(64), nullable=False, server_default="UNCLASSIFIED"),
            sa.Column("entropy", sa.Float(), nullable=True),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
            sa.Column("total_queries", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"),
            sa.Column("source", sa.String(128), nullable=False, server_default="TELEMETRY"),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_domains_reg_domain", "domains", ["registered_domain"])
        op.create_index("ix_domains_reputation", "domains", ["reputation"])
        op.create_index("ix_domains_classification", "domains", ["classification"])

    # 4. dns_policies
    if "dns_policies" not in tables:
        op.create_table(
            "dns_policies",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("version", sa.String(32), nullable=False, server_default="1.0.0"),
            sa.Column("scope", sa.String(64), nullable=False, server_default="GLOBAL"),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("conditions", sa.JSON(), nullable=False),
            sa.Column("action", sa.String(32), nullable=False, server_default="BLOCK"),
            sa.Column("sinkhole_ip", sa.String(64), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_by", sa.String(128), nullable=False, server_default="SYSTEM"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_policies_scope_priority", "dns_policies", ["scope", "priority"])

    # 5. dns_list_entries
    if "dns_list_entries" not in tables:
        op.create_table(
            "dns_list_entries",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("list_type", sa.String(32), nullable=False),
            sa.Column("domain_pattern", sa.String(512), nullable=False),
            sa.Column("pattern_type", sa.String(32), nullable=False, server_default="EXACT"),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("scope", sa.String(64), nullable=False, server_default="PROJECT"),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("created_by", sa.String(128), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("evidence_reference", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_list_entries_type_pat", "dns_list_entries", ["list_type", "domain_pattern"])
        op.create_index("ix_dns_list_entries_active", "dns_list_entries", ["is_active", "expires_at"])

    # 6. dns_decisions
    if "dns_decisions" not in tables:
        op.create_table(
            "dns_decisions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("dns_event_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dns_policies.id", ondelete="SET NULL"), nullable=True),
            sa.Column("identity", sa.String(255), nullable=False),
            sa.Column("domain", sa.String(512), nullable=False),
            sa.Column("action", sa.String(32), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("execution_status", sa.String(32), nullable=False, server_default="REQUESTED"),
            sa.Column("enforced_by", sa.String(64), nullable=False, server_default="DNS_GATEWAY"),
            sa.Column("post_enforcement_verified", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_decisions_action_status", "dns_decisions", ["action", "execution_status"])
        op.create_index("ix_dns_decisions_domain", "dns_decisions", ["domain"])

    # 7. dns_signals
    if "dns_signals" not in tables:
        op.create_table(
            "dns_signals",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("signal_key", sa.String(64), nullable=False, unique=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("alert_type", sa.String(64), nullable=False),
            sa.Column("severity", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("domain", sa.String(512), nullable=False),
            sa.Column("entity_id", sa.String(255), nullable=False),
            sa.Column("entity_type", sa.String(64), nullable=False, server_default="WORKLOAD"),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("raw_event_ids", sa.JSON(), nullable=True),
            sa.Column("soc_alert_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="NEW"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_signals_type_sev", "dns_signals", ["alert_type", "severity"])
        op.create_index("ix_dns_signals_entity", "dns_signals", ["entity_type", "entity_id"])

    # 8. dns_baselines
    if "dns_baselines" not in tables:
        op.create_table(
            "dns_baselines",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("entity_id", sa.String(255), nullable=False),
            sa.Column("entity_type", sa.String(64), nullable=False, server_default="WORKLOAD"),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("known_domains", sa.JSON(), nullable=True),
            sa.Column("avg_qps", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("nxdomain_ratio", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("last_calculated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_dns_baselines_unique", "dns_baselines", ["entity_id", "entity_type"], unique=True)


def downgrade() -> None:
    op.drop_table("dns_baselines")
    op.drop_table("dns_signals")
    op.drop_table("dns_decisions")
    op.drop_table("dns_list_entries")
    op.drop_table("dns_policies")
    op.drop_table("domains")
    op.drop_table("dns_events")
    op.drop_table("dns_data_sources")
