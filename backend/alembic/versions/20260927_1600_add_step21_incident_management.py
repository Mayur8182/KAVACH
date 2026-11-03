"""add_step21_incident_management

Revision ID: 20260927_1600
Revises: 20260927_1500
Create Date: 2026-09-27 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1600"
down_revision: Union[str, None] = "20260927_1500"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: security_incidents and security_incident_events may exist from Step 14.
    # We add any missing Step 21 columns to security_incidents if table already exists,
    # or create if not present.
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "security_incidents" not in tables:
        op.create_table(
            "security_incidents",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("incident_key", sa.String(100), nullable=False, unique=True, index=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("incident_type", sa.String(100), nullable=False, index=True),
            sa.Column("severity", sa.String(50), nullable=False, index=True),
            sa.Column("status", sa.String(50), nullable=False, index=True),
            sa.Column("environment", sa.String(50), nullable=False, default="PRODUCTION"),
            sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("first_observed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_observed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("first_detected_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_detected_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("primary_violation_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("reported_by_type", sa.String(100), nullable=False, default="SYSTEM"),
            sa.Column("reported_by_id", sa.String(255), nullable=False, default="CONTROL_PLANE"),
            sa.Column("primary_resource_type", sa.String(100), nullable=False, default="WORKLOAD"),
            sa.Column("primary_resource_id", sa.String(255), nullable=False, default="UNKNOWN"),
            sa.Column("root_cause_status", sa.String(50), nullable=False, default="UNKNOWN"),
            sa.Column("containment_status", sa.String(50), nullable=False, default="NOT_REQUIRED"),
            sa.Column("recovery_status", sa.String(50), nullable=False, default="NOT_REQUIRED"),
            sa.Column("closure_reason", sa.String(255), nullable=True),
            sa.Column("closed_with_limitations", sa.Boolean(), default=False),
            sa.Column("outstanding_uncertainty", sa.Text(), nullable=True),
            sa.Column("closed_by", sa.String(255), nullable=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
    else:
        existing_cols = [c["name"] for c in inspector.get_columns("security_incidents")]
        for col_name, col_type in [
            ("incident_key", sa.String(100)),
            ("description", sa.Text()),
            ("incident_type", sa.String(100)),
            ("environment", sa.String(50)),
            ("detected_at", sa.DateTime(timezone=True)),
            ("first_observed_at", sa.DateTime(timezone=True)),
            ("last_observed_at", sa.DateTime(timezone=True)),
            ("reported_by_type", sa.String(100)),
            ("reported_by_id", sa.String(255)),
            ("primary_resource_type", sa.String(100)),
            ("primary_resource_id", sa.String(255)),
            ("root_cause_status", sa.String(50)),
            ("containment_status", sa.String(50)),
            ("recovery_status", sa.String(50)),
            ("closure_reason", sa.String(255)),
            ("closed_with_limitations", sa.Boolean()),
            ("outstanding_uncertainty", sa.Text()),
            ("closed_by", sa.String(255)),
            ("closed_at", sa.DateTime(timezone=True)),
            ("metadata", sa.JSON()),
        ]:
            if col_name not in existing_cols:
                op.add_column("security_incidents", sa.Column(col_name, col_type, nullable=True))

    if "security_incident_events" not in tables:
        op.create_table(
            "security_incident_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("event_id", sa.String(255), nullable=False, index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 1. security_incident_signals
    if "security_incident_signals" not in tables:
        op.create_table(
            "security_incident_signals",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("source_type", sa.String(100), nullable=False),
            sa.Column("source_id", sa.String(255), nullable=False),
            sa.Column("signal_type", sa.String(100), nullable=False),
            sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("evidence_id", sa.String(255), nullable=True),
            sa.Column("relationship_type", sa.String(50), nullable=False, default="TRIGGERED"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 2. security_incident_timeline
    if "security_incident_timeline" not in tables:
        op.create_table(
            "security_incident_timeline",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("event_time", sa.DateTime(timezone=True), nullable=False),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("source_type", sa.String(100), nullable=False),
            sa.Column("source_id", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("evidence_id", sa.String(255), nullable=True),
            sa.Column("actor_type", sa.String(100), nullable=True),
            sa.Column("actor_id", sa.String(255), nullable=True),
            sa.Column("resource_type", sa.String(100), nullable=True),
            sa.Column("resource_id", sa.String(255), nullable=True),
            sa.Column("confidence", sa.String(50), nullable=False, default="OBSERVED"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 3. security_incident_evidence
    if "security_incident_evidence" not in tables:
        op.create_table(
            "security_incident_evidence",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("evidence_id", sa.String(255), nullable=False, index=True),
            sa.Column("role", sa.String(50), nullable=False, default="PRIMARY"),
            sa.Column("relevance", sa.String(255), nullable=True),
            sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("collector_type", sa.String(100), nullable=False),
            sa.Column("collector_id", sa.String(255), nullable=False),
            sa.Column("authorization_context", sa.JSON(), nullable=True),
            sa.Column("integrity_hash", sa.String(64), nullable=False),
            sa.Column("hash_algorithm", sa.String(20), nullable=False, default="SHA-256"),
            sa.Column("artifact_size_bytes", sa.Integer(), default=0),
            sa.Column("redacted_content", sa.JSON(), nullable=True),
            sa.Column("is_secret_redacted", sa.Boolean(), default=True),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 4. evidence_chain_events
    if "evidence_chain_events" not in tables:
        op.create_table(
            "evidence_chain_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("evidence_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incident_evidence.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("action", sa.String(50), nullable=False),
            sa.Column("actor_type", sa.String(100), nullable=False),
            sa.Column("actor_id", sa.String(255), nullable=False),
            sa.Column("purpose", sa.String(255), nullable=False),
            sa.Column("authorization", sa.JSON(), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        )

    # 5. security_investigation_cases
    if "security_investigation_cases" not in tables:
        op.create_table(
            "security_investigation_cases",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("status", sa.String(50), nullable=False, default="OPEN", index=True),
            sa.Column("lead_actor_type", sa.String(100), nullable=False, default="HUMAN"),
            sa.Column("lead_actor_id", sa.String(255), nullable=False),
            sa.Column("objective", sa.String(100), nullable=False, default="IDENTIFY_ROOT_CAUSE"),
            sa.Column("scope", sa.JSON(), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("conclusion", sa.Text(), nullable=True),
            sa.Column("conclusion_status", sa.String(50), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 6. investigation_questions
    if "investigation_questions" not in tables:
        op.create_table(
            "investigation_questions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column("status", sa.String(50), nullable=False, default="OPEN"),
            sa.Column("evidence_references", sa.JSON(), nullable=True),
            sa.Column("answer", sa.Text(), nullable=True),
            sa.Column("answer_confidence", sa.String(50), nullable=True),
            sa.Column("answered_by", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 7. investigation_hypotheses_v2
    if "investigation_hypotheses_v2" not in tables:
        op.create_table(
            "investigation_hypotheses_v2",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("hypothesis", sa.Text(), nullable=False),
            sa.Column("source", sa.String(50), nullable=False, default="AI_PROPOSED"),
            sa.Column("supporting_evidence", sa.JSON(), nullable=True),
            sa.Column("contradicting_evidence", sa.JSON(), nullable=True),
            sa.Column("status", sa.String(50), nullable=False, default="PROPOSED"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 8. incident_root_causes
    if "incident_root_causes" not in tables:
        op.create_table(
            "incident_root_causes",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_investigation_cases.id", ondelete="SET NULL"), nullable=True),
            sa.Column("root_cause_statement", sa.Text(), nullable=False),
            sa.Column("status", sa.String(50), nullable=False, default="HYPOTHESIS"),
            sa.Column("supporting_evidence_ids", sa.JSON(), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("verified_by", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 9. incident_containment_records
    if "incident_containment_records" not in tables:
        op.create_table(
            "incident_containment_records",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("action_type", sa.String(100), nullable=False),
            sa.Column("target_type", sa.String(100), nullable=False),
            sa.Column("target_id", sa.String(255), nullable=False),
            sa.Column("scope", sa.JSON(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("status", sa.String(50), nullable=False, default="PROPOSED"),
            sa.Column("policy_decision_id", sa.String(255), nullable=True),
            sa.Column("step14_response_id", sa.String(255), nullable=True),
            sa.Column("post_action_evidence_id", sa.String(255), nullable=True),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 10. incident_recovery_records
    if "incident_recovery_records" not in tables:
        op.create_table(
            "incident_recovery_records",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("action_type", sa.String(100), nullable=False),
            sa.Column("target", sa.String(255), nullable=False),
            sa.Column("status", sa.String(50), nullable=False, default="PENDING"),
            sa.Column("post_recovery_evidence_id", sa.String(255), nullable=True),
            sa.Column("reverification_result", sa.JSON(), nullable=True),
            sa.Column("recovered_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 11. incident_postmortems
    if "incident_postmortems" not in tables:
        op.create_table(
            "incident_postmortems",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("timeline", sa.JSON(), nullable=True),
            sa.Column("root_cause", sa.Text(), nullable=False),
            sa.Column("contributing_factors", sa.JSON(), nullable=True),
            sa.Column("controls_involved", sa.JSON(), nullable=True),
            sa.Column("containment_summary", sa.Text(), nullable=True),
            sa.Column("recovery_summary", sa.Text(), nullable=True),
            sa.Column("remediation_summary", sa.Text(), nullable=True),
            sa.Column("lessons_learned", sa.JSON(), nullable=True),
            sa.Column("evidence_references", sa.JSON(), nullable=True),
            sa.Column("approved_by", sa.String(255), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 12. incident_relationships
    if "incident_relationships" not in tables:
        op.create_table(
            "incident_relationships",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("source_incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("target_incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("relationship_type", sa.String(50), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 13. incident_assignments
    if "incident_assignments" not in tables:
        op.create_table(
            "incident_assignments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("assignee_type", sa.String(50), nullable=False),
            sa.Column("assignee_id", sa.String(255), nullable=False),
            sa.Column("assigned_by", sa.String(255), nullable=False),
            sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 14. incident_exports
    if "incident_exports" not in tables:
        op.create_table(
            "incident_exports",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("actor_type", sa.String(50), nullable=False),
            sa.Column("actor_id", sa.String(255), nullable=False),
            sa.Column("purpose", sa.String(255), nullable=False),
            sa.Column("scope", sa.JSON(), nullable=True),
            sa.Column("export_hash", sa.String(64), nullable=False),
            sa.Column("redacted", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    for tbl in [
        "incident_exports",
        "incident_assignments",
        "incident_relationships",
        "incident_postmortems",
        "incident_recovery_records",
        "incident_containment_records",
        "incident_root_causes",
        "investigation_hypotheses_v2",
        "investigation_questions",
        "security_investigation_cases",
        "evidence_chain_events",
        "security_incident_evidence",
        "security_incident_timeline",
        "security_incident_signals",
    ]:
        op.drop_table(tbl)
