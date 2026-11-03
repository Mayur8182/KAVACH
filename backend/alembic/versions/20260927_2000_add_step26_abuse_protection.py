"""add_step26_abuse_protection

Revision ID: 20260927_2000
Revises: 20260927_1900
Create Date: 2026-09-27 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_2000"
down_revision: Union[str, None] = "20260927_1900"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. rate_limit_policies
    if "rate_limit_policies" not in tables:
        op.create_table(
            "rate_limit_policies",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("scope", sa.String(64), nullable=False, server_default="GLOBAL"),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("algorithm", sa.String(64), nullable=False, server_default="TOKEN_BUCKET"),
            sa.Column("limit_count", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("window_seconds", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("burst", sa.Integer(), nullable=False, server_default="20"),
            sa.Column("concurrency_limit", sa.Integer(), nullable=True),
            sa.Column("fail_behavior", sa.String(32), nullable=False, server_default="FAIL_OPEN"),
            sa.Column("conditions", sa.JSON(), nullable=True),
            sa.Column("action", sa.String(32), nullable=False, server_default="THROTTLE"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("dry_run", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("created_by", sa.String(255), nullable=False, server_default="SYSTEM"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_rate_limit_policies_scope", "rate_limit_policies", ["scope", "priority"])
        op.create_index("idx_rate_limit_policies_tenant", "rate_limit_policies", ["tenant_id", "enabled"])

    # 2. rate_limit_policy_versions
    if "rate_limit_policy_versions" not in tables:
        op.create_table(
            "rate_limit_policy_versions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rate_limit_policies.id", ondelete="CASCADE"), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("snapshot", sa.JSON(), nullable=False),
            sa.Column("change_summary", sa.Text(), nullable=True),
            sa.Column("changed_by", sa.String(255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_rl_version_policy_id", "rate_limit_policy_versions", ["policy_id", "version"])

    # 3. rate_limit_decisions
    if "rate_limit_decisions" not in tables:
        op.create_table(
            "rate_limit_decisions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rate_limit_policies.id", ondelete="SET NULL"), nullable=True),
            sa.Column("policy_name", sa.String(255), nullable=True),
            sa.Column("identity_key", sa.String(512), nullable=False),
            sa.Column("identity_type", sa.String(64), nullable=False),
            sa.Column("endpoint", sa.String(512), nullable=False),
            sa.Column("http_method", sa.String(16), nullable=False, server_default="POST"),
            sa.Column("algorithm_used", sa.String(64), nullable=False),
            sa.Column("tokens_remaining", sa.Float(), nullable=True),
            sa.Column("retry_after_seconds", sa.Integer(), nullable=True),
            sa.Column("decision", sa.String(32), nullable=False),
            sa.Column("execution_status", sa.String(32), nullable=False, server_default="APPLIED"),
            sa.Column("dry_run", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_rl_decision_timestamp", "rate_limit_decisions", ["timestamp"])
        op.create_index("idx_rl_decision_identity", "rate_limit_decisions", ["identity_key", "decision"])
        op.create_index("idx_rl_decision_endpoint", "rate_limit_decisions", ["endpoint"])

    # 4. abuse_detection_rules
    if "abuse_detection_rules" not in tables:
        op.create_table(
            "abuse_detection_rules",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("rule_type", sa.String(64), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("severity", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("thresholds", sa.JSON(), nullable=False),
            sa.Column("conditions", sa.JSON(), nullable=True),
            sa.Column("automated_action", sa.String(32), nullable=False, server_default="ALERT"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 5. abuse_detection_events
    if "abuse_detection_events" not in tables:
        op.create_table(
            "abuse_detection_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("event_type", sa.String(64), nullable=False),
            sa.Column("endpoint", sa.String(512), nullable=False),
            sa.Column("http_method", sa.String(16), nullable=False, server_default="POST"),
            sa.Column("result_status", sa.String(64), nullable=False),
            sa.Column("ip_address", sa.String(128), nullable=False),
            sa.Column("user_id", sa.String(255), nullable=True),
            sa.Column("account_identifier", sa.String(255), nullable=True),
            sa.Column("session_id", sa.String(255), nullable=True),
            sa.Column("device_id", sa.String(255), nullable=True),
            sa.Column("user_agent", sa.String(512), nullable=True),
            sa.Column("agent_id", sa.String(255), nullable=True),
            sa.Column("tool_name", sa.String(255), nullable=True),
            sa.Column("workload_identity", sa.String(255), nullable=True),
            sa.Column("duration_ms", sa.Float(), nullable=True),
            sa.Column("metadata_payload", sa.JSON(), nullable=True),
            sa.Column("raw_hash", sa.String(64), nullable=False),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_abuse_event_timestamp", "abuse_detection_events", ["timestamp"])
        op.create_index("idx_abuse_event_ip", "abuse_detection_events", ["ip_address", "timestamp"])
        op.create_index("idx_abuse_event_account", "abuse_detection_events", ["account_identifier", "timestamp"])
        op.create_index("idx_abuse_event_agent", "abuse_detection_events", ["agent_id", "timestamp"])

    # 6. abuse_detection_signals
    if "abuse_detection_signals" not in tables:
        op.create_table(
            "abuse_detection_signals",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("signal_type", sa.String(64), nullable=False),
            sa.Column("severity", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"),
            sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.85"),
            sa.Column("target_resource", sa.String(512), nullable=False),
            sa.Column("target_identity", sa.String(512), nullable=False),
            sa.Column("detection_rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("abuse_detection_rules.id", ondelete="SET NULL"), nullable=True),
            sa.Column("rule_name", sa.String(255), nullable=True),
            sa.Column("evidence", sa.JSON(), nullable=False),
            sa.Column("recommended_action", sa.String(64), nullable=True),
            sa.Column("action_taken", sa.String(64), nullable=True),
            sa.Column("escalation_reference", sa.String(255), nullable=True),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_abuse_signal_target", "abuse_detection_signals", ["target_identity", "signal_type"])
        op.create_index("idx_abuse_signal_status", "abuse_detection_signals", ["status", "detected_at"])

    # 7. abuse_detection_cases
    if "abuse_detection_cases" not in tables:
        op.create_table(
            "abuse_detection_cases",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_number", sa.String(64), nullable=False, unique=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("attack_pattern", sa.String(64), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="OPEN"),
            sa.Column("severity", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("primary_entity", sa.String(512), nullable=False),
            sa.Column("impact_summary", sa.Text(), nullable=True),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("signal_ids", sa.JSON(), nullable=True),
            sa.Column("remediation_status", sa.String(32), nullable=False, server_default="PENDING"),
            sa.Column("soc_alert_id", sa.String(255), nullable=True),
            sa.Column("incident_id", sa.String(255), nullable=True),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 8. temporary_blocks
    if "temporary_blocks" not in tables:
        op.create_table(
            "temporary_blocks",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("block_type", sa.String(32), nullable=False),
            sa.Column("target_value", sa.String(512), nullable=False),
            sa.Column("scope", sa.String(64), nullable=False, server_default="GLOBAL"),
            sa.Column("endpoint_scope", sa.String(512), nullable=True),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("policy_reference", sa.String(255), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by", sa.String(255), nullable=False, server_default="SYSTEM"),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_temp_block_target", "temporary_blocks", ["block_type", "target_value", "active"])
        op.create_index("idx_temp_block_expires", "temporary_blocks", ["expires_at", "active"])

    # 9. permanent_blocks
    if "permanent_blocks" not in tables:
        op.create_table(
            "permanent_blocks",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("block_type", sa.String(32), nullable=False),
            sa.Column("target_value", sa.String(512), nullable=False),
            sa.Column("scope", sa.String(64), nullable=False, server_default="GLOBAL"),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("authorized_by", sa.String(255), nullable=False),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_perm_block_target", "permanent_blocks", ["block_type", "target_value", "active"])

    # 10. security_challenges
    if "security_challenges" not in tables:
        op.create_table(
            "security_challenges",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("challenge_type", sa.String(32), nullable=False),
            sa.Column("target_identity", sa.String(512), nullable=False),
            sa.Column("endpoint", sa.String(512), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("context_data", sa.JSON(), nullable=True),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("idx_security_challenge_status", "security_challenges", ["target_identity", "status"])

    # 11. response_actions
    if "response_actions" not in tables:
        op.create_table(
            "response_actions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("action_type", sa.String(64), nullable=False),
            sa.Column("target_entity", sa.String(512), nullable=False),
            sa.Column("execution_status", sa.String(32), nullable=False, server_default="REQUESTED"),
            sa.Column("parameters", sa.JSON(), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("initiated_by", sa.String(255), nullable=False, server_default="POLICY_ENGINE"),
            sa.Column("tenant_id", sa.String(128), nullable=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 12. response_verifications
    if "response_verifications" not in tables:
        op.create_table(
            "response_verifications",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("action_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("response_actions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("target_entity", sa.String(512), nullable=False),
            sa.Column("verification_status", sa.String(32), nullable=False),
            sa.Column("expected_outcome", sa.Text(), nullable=False),
            sa.Column("observed_outcome", sa.Text(), nullable=False),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("response_verifications")
    op.drop_table("response_actions")
    op.drop_table("security_challenges")
    op.drop_table("permanent_blocks")
    op.drop_table("temporary_blocks")
    op.drop_table("abuse_detection_cases")
    op.drop_table("abuse_detection_signals")
    op.drop_table("abuse_detection_events")
    op.drop_table("abuse_detection_rules")
    op.drop_table("rate_limit_decisions")
    op.drop_table("rate_limit_policy_versions")
    op.drop_table("rate_limit_policies")
