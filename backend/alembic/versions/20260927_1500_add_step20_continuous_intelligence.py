"""add_step20_continuous_intelligence

Revision ID: 20260927_1500
Revises: 20260927_1445
Create Date: 2026-09-27 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1500"
down_revision: Union[str, None] = "20260927_1445"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_drift_events
    op.create_table(
        "security_drift_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("drift_type", sa.String(), nullable=False, index=True),
        sa.Column("resource_type", sa.String(), nullable=False, index=True),
        sa.Column("resource_id", sa.String(), nullable=False, index=True),
        sa.Column("source_event_id", sa.String(), nullable=True),
        sa.Column("previous_state", sa.JSON(), nullable=False),
        sa.Column("current_state", sa.JSON(), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("environment", sa.String(), nullable=False, server_default="PRODUCTION", index=True),
        sa.Column("severity_context", sa.String(), nullable=False, server_default="MEDIUM", index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="DETECTED", index=True),
        sa.Column("dismissed_by", sa.String(), nullable=True),
        sa.Column("dismissed_reason", sa.Text(), nullable=True),
        sa.Column("evidence_id", sa.String(), nullable=True, index=True),
        sa.Column("graph_version", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 2. security_control_freshness
    op.create_table(
        "security_control_freshness",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("requirement_id", sa.String(), nullable=False, index=True),
        sa.Column("contract_id", sa.String(), nullable=True, index=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_window_seconds", sa.Integer(), server_default="86400"),
        sa.Column("freshness_policy", sa.String(), server_default="MAX_AGE_24H"),
        sa.Column("status", sa.String(), nullable=False, server_default="FRESH", index=True),
        sa.Column("stale_reason", sa.Text(), nullable=True),
        sa.Column("affected_resource_id", sa.String(), nullable=True, index=True),
        sa.Column("last_evidence_id", sa.String(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 3. security_verification_triggers
    op.create_table(
        "security_verification_triggers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("trigger_type", sa.String(), nullable=False, index=True),
        sa.Column("trigger_source_id", sa.String(), nullable=True),
        sa.Column("contract_id", sa.String(), nullable=True),
        sa.Column("requirement_id", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("configuration", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. security_verification_jobs
    op.create_table(
        "security_verification_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("trigger_type", sa.String(), nullable=False, index=True),
        sa.Column("trigger_id", sa.String(), nullable=True),
        sa.Column("contract_id", sa.String(), nullable=True, index=True),
        sa.Column("requirement_id", sa.String(), nullable=True, index=True),
        sa.Column("target_type", sa.String(), nullable=True),
        sa.Column("target_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="QUEUED", index=True),
        sa.Column("deduplication_key", sa.String(), nullable=True, index=True),
        sa.Column("result", sa.String(), nullable=True),
        sa.Column("evidence_ids", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 5. security_behavior_baselines
    op.create_table(
        "security_behavior_baselines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("subject_type", sa.String(), nullable=False, index=True),
        sa.Column("subject_id", sa.String(), nullable=False, index=True),
        sa.Column("metric", sa.String(), nullable=False, index=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
        sa.Column("calculation_method", sa.String(), nullable=False),
        sa.Column("baseline_value", sa.JSON(), nullable=False),
        sa.Column("variance", sa.JSON(), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="1.0"),
        sa.Column("source", sa.String(), server_default="OPENTELEMETRY_EVENTS"),
        sa.Column("eligibility_status", sa.String(), server_default="ELIGIBLE_FOR_BASELINE", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 6. security_behavior_events
    op.create_table(
        "security_behavior_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("subject_type", sa.String(), nullable=False, index=True),
        sa.Column("subject_id", sa.String(), nullable=False, index=True),
        sa.Column("event_type", sa.String(), nullable=False, index=True),
        sa.Column("observed_value", sa.JSON(), nullable=False),
        sa.Column("baseline_reference", sa.String(), nullable=True),
        sa.Column("deviation_context", sa.JSON(), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("evidence_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="NORMAL", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 7. security_change_correlations
    op.create_table(
        "security_change_correlations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("correlation_key", sa.String(), nullable=False, index=True),
        sa.Column("causality_status", sa.String(), nullable=False, server_default="TEMPORALLY_ASSOCIATED"),
        sa.Column("timeline", sa.JSON(), nullable=True),
        sa.Column("first_event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_count", sa.Integer(), server_default="0"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 8. security_correlation_members
    op.create_table(
        "security_correlation_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("correlation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_change_correlations.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(), nullable=False, index=True),
        sa.Column("source_id", sa.String(), nullable=False, index=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )

    # 9. security_control_effectiveness
    op.create_table(
        "security_control_effectiveness",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("control_id", sa.String(), nullable=False, index=True),
        sa.Column("verification_count", sa.Integer(), server_default="0"),
        sa.Column("verified_count", sa.Integer(), server_default="0"),
        sa.Column("violated_count", sa.Integer(), server_default="0"),
        sa.Column("unknown_count", sa.Integer(), server_default="0"),
        sa.Column("stale_count", sa.Integer(), server_default="0"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_violated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_patterns", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 10. security_policy_recommendations
    op.create_table(
        "security_policy_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_event_id", sa.String(), nullable=True),
        sa.Column("current_policy_version", sa.String(), nullable=True),
        sa.Column("proposed_policy", sa.JSON(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PROPOSED", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.String(), nullable=True),
    )

    # 11. security_contract_recommendations
    op.create_table(
        "security_contract_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_event_id", sa.String(), nullable=True),
        sa.Column("proposed_contract", sa.JSON(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PROPOSED", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.String(), nullable=True),
    )

    # 12. security_requirement_recommendations
    op.create_table(
        "security_requirement_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_event_id", sa.String(), nullable=True),
        sa.Column("proposed_requirement", sa.JSON(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PROPOSED", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.String(), nullable=True),
    )

    # 13. security_intelligence_events
    op.create_table(
        "security_intelligence_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(), nullable=False, index=True),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("subject_type", sa.String(), nullable=True),
        sa.Column("subject_id", sa.String(), nullable=True),
        sa.Column("severity_context", sa.String(), nullable=False, server_default="INFO", index=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("correlation_id", sa.String(), nullable=True, index=True),
        sa.Column("graph_version", sa.Integer(), nullable=True),
        sa.Column("evidence_id", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("security_intelligence_events")
    op.drop_table("security_requirement_recommendations")
    op.drop_table("security_contract_recommendations")
    op.drop_table("security_policy_recommendations")
    op.drop_table("security_control_effectiveness")
    op.drop_table("security_correlation_members")
    op.drop_table("security_change_correlations")
    op.drop_table("security_behavior_events")
    op.drop_table("security_behavior_baselines")
    op.drop_table("security_verification_jobs")
    op.drop_table("security_verification_triggers")
    op.drop_table("security_control_freshness")
    op.drop_table("security_drift_events")
