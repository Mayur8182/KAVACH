"""add_step23_soc_platform

Revision ID: 20260927_1700
Revises: 20260927_1600
Create Date: 2026-09-27 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1700"
down_revision: Union[str, None] = "20260927_1600"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. event_sources
    if "event_sources" not in tables:
        op.create_table(
            "event_sources",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
            sa.Column("source_name", sa.String(), nullable=False),
            sa.Column("source_type", sa.String(), nullable=False, index=True),
            sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
            sa.Column("adapter_version", sa.String(), nullable=False, server_default="1.0.0"),
            sa.Column("configuration", sa.JSON(), nullable=True),
            sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("events_received_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("events_failed_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 2. security_events
    if "security_events" not in tables:
        op.create_table(
            "security_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("event_id", sa.String(), nullable=False, unique=True, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("event_sources.id"), nullable=True, index=True),
            sa.Column("source_type", sa.String(), nullable=False, index=True),
            sa.Column("event_type", sa.String(), nullable=False, index=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, index=True),
            sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("actor", sa.JSON(), nullable=False),
            sa.Column("resource", sa.JSON(), nullable=False),
            sa.Column("action", sa.String(), nullable=False, index=True),
            sa.Column("result", sa.String(), nullable=False, index=True),
            sa.Column("severity", sa.String(), nullable=False, server_default="INFO"),
            sa.Column("environment", sa.String(), nullable=False, server_default="PRODUCTION"),
            sa.Column("correlation_id", sa.String(), nullable=True, index=True),
            sa.Column("trace_id", sa.String(), nullable=True, index=True),
            sa.Column("request_id", sa.String(), nullable=True, index=True),
            sa.Column("raw_event_reference", sa.String(), nullable=True),
            sa.Column("raw_payload", sa.JSON(), nullable=False),
            sa.Column("attributes", sa.JSON(), nullable=True),
            sa.Column("ingestion_status", sa.String(), nullable=False, server_default="NORMALIZED"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_security_events_project_time", "security_events", ["project_id", "timestamp"])
        op.create_index("ix_security_events_type_res", "security_events", ["event_type", "result"])

    # 3. event_enrichments
    if "event_enrichments" not in tables:
        op.create_table(
            "event_enrichments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_events.id"), nullable=False, index=True),
            sa.Column("enrichment_type", sa.String(), nullable=False),
            sa.Column("enrichment_data", sa.JSON(), nullable=False),
            sa.Column("enriched_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("version", sa.String(), nullable=False, server_default="1.0.0"),
        )

    # 4. detection_rules
    if "detection_rules" not in tables:
        op.create_table(
            "detection_rules",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("rule_id", sa.String(), nullable=False, unique=True, index=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("version", sa.String(), nullable=False, server_default="1.0.0"),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("lifecycle_status", sa.String(), nullable=False, server_default="ACTIVE"),
            sa.Column("event_types", sa.JSON(), nullable=False),
            sa.Column("conditions", sa.JSON(), nullable=False),
            sa.Column("severity", sa.String(), nullable=False, server_default="HIGH"),
            sa.Column("confidence", sa.String(), nullable=False, server_default="HIGH"),
            sa.Column("scope", sa.JSON(), nullable=True),
            sa.Column("created_by", sa.String(), nullable=False, server_default="SYSTEM"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 5. detection_executions
    if "detection_executions" not in tables:
        op.create_table(
            "detection_executions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("detection_rules.id"), nullable=False, index=True),
            sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("events_evaluated_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("matches_found_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("execution_duration_ms", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(), nullable=False, server_default="SUCCESS"),
            sa.Column("error_message", sa.Text(), nullable=True),
        )

    # 6. soc_alerts
    if "soc_alerts" not in tables:
        op.create_table(
            "soc_alerts",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("alert_key", sa.String(), nullable=False, unique=True, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
            sa.Column("detection_rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("detection_rules.id"), nullable=True, index=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("severity", sa.String(), nullable=False, server_default="HIGH"),
            sa.Column("confidence", sa.String(), nullable=False, server_default="HIGH"),
            sa.Column("status", sa.String(), nullable=False, server_default="NEW"),
            sa.Column("deduplication_key", sa.String(), nullable=False, index=True),
            sa.Column("event_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("source", sa.String(), nullable=False),
            sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("acknowledged_by", sa.String(), nullable=True),
            sa.Column("assignee_id", sa.String(), nullable=True),
            sa.Column("assignee_type", sa.String(), nullable=False, server_default="ANALYST"),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("risk_assessment", sa.JSON(), nullable=True),
            sa.Column("triage_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_soc_alerts_proj_stat_sev", "soc_alerts", ["project_id", "status", "severity"])

    # 7. alert_events
    if "alert_events" not in tables:
        op.create_table(
            "alert_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_alerts.id"), nullable=False, index=True),
            sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_events.id"), nullable=False, index=True),
            sa.Column("association_type", sa.String(), nullable=False, server_default="TRIGGER"),
            sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 8. alert_correlations
    if "alert_correlations" not in tables:
        op.create_table(
            "alert_correlations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("primary_alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_alerts.id"), nullable=False, index=True),
            sa.Column("correlated_alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_alerts.id"), nullable=False, index=True),
            sa.Column("relationship", sa.String(), nullable=False, server_default="CORRELATED"),
            sa.Column("correlation_rule", sa.String(), nullable=False),
            sa.Column("correlation_score", sa.Float(), nullable=True),
            sa.Column("evidence_summary", sa.Text(), nullable=False),
            sa.Column("correlated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 9. soc_cases
    if "soc_cases" not in tables:
        op.create_table(
            "soc_cases",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_key", sa.String(), nullable=False, unique=True, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("priority", sa.String(), nullable=False, server_default="HIGH"),
            sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
            sa.Column("owner_id", sa.String(), nullable=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("timeline", sa.JSON(), nullable=True),
            sa.Column("resolution_summary", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 10. case_events
    if "case_events" not in tables:
        op.create_table(
            "case_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_cases.id"), nullable=False, index=True),
            sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_events.id"), nullable=False, index=True),
            sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 11. case_evidence
    if "case_evidence" not in tables:
        op.create_table(
            "case_evidence",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_cases.id"), nullable=False, index=True),
            sa.Column("evidence_id", sa.String(), nullable=False, index=True),
            sa.Column("evidence_role", sa.String(), nullable=False, server_default="PRIMARY"),
            sa.Column("added_by", sa.String(), nullable=False),
            sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 12. soc_watchlists
    if "soc_watchlists" not in tables:
        op.create_table(
            "soc_watchlists",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("watchlist_type", sa.String(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False, server_default="SYSTEM"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 13. watchlist_entities
    if "watchlist_entities" not in tables:
        op.create_table(
            "watchlist_entities",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("watchlist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_watchlists.id"), nullable=False, index=True),
            sa.Column("entity_type", sa.String(), nullable=False),
            sa.Column("entity_identifier", sa.String(), nullable=False, index=True),
            sa.Column("entity_name", sa.String(), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("added_by", sa.String(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 14. investigation_notes
    if "investigation_notes" not in tables:
        op.create_table(
            "investigation_notes",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("target_type", sa.String(), nullable=False),
            sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("author_id", sa.String(), nullable=False),
            sa.Column("author_name", sa.String(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("evidence_references", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 15. soc_actions
    if "soc_actions" not in tables:
        op.create_table(
            "soc_actions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column("action_type", sa.String(), nullable=False),
            sa.Column("target_resource", sa.String(), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("policy_decision_id", sa.String(), nullable=True),
            sa.Column("approval_id", sa.String(), nullable=True),
            sa.Column("status", sa.String(), nullable=False, server_default="PENDING"),
            sa.Column("requested_by", sa.String(), nullable=False),
            sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        )

    # 16. soc_action_results
    if "soc_action_results" not in tables:
        op.create_table(
            "soc_action_results",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("action_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_actions.id"), nullable=False, index=True),
            sa.Column("execution_status", sa.String(), nullable=False),
            sa.Column("post_action_evidence_id", sa.String(), nullable=True),
            sa.Column("reverification_status", sa.String(), nullable=False, server_default="UNKNOWN"),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("soc_action_results")
    op.drop_table("soc_actions")
    op.drop_table("investigation_notes")
    op.drop_table("watchlist_entities")
    op.drop_table("soc_watchlists")
    op.drop_table("case_evidence")
    op.drop_table("case_events")
    op.drop_table("soc_cases")
    op.drop_table("alert_correlations")
    op.drop_table("alert_events")
    op.drop_table("soc_alerts")
    op.drop_table("detection_executions")
    op.drop_table("detection_rules")
    op.drop_table("event_enrichments")
    op.drop_table("security_events")
    op.drop_table("event_sources")
