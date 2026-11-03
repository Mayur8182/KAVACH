"""add_step24_threat_intelligence

Revision ID: 20260927_1800
Revises: 20260927_1700
Create Date: 2026-09-27 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1800"
down_revision: Union[str, None] = "20260927_1700"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. threat_intelligence_sources
    if "threat_intelligence_sources" not in tables:
        op.create_table(
            "threat_intelligence_sources",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False, unique=True),
            sa.Column("source_type", sa.String(64), nullable=False),
            sa.Column("provider", sa.String(255), nullable=False),
            sa.Column("protocol", sa.String(32), nullable=False, server_default="HTTPS"),
            sa.Column("endpoint", sa.String(1024), nullable=False),
            sa.Column("authentication_type", sa.String(64), nullable=False, server_default="NONE"),
            sa.Column("configuration", sa.JSON(), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("poll_interval_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(64), nullable=False, server_default="CONFIGURED"),
            sa.Column("status_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 2. threat_feed_syncs
    if "threat_feed_syncs" not in tables:
        op.create_table(
            "threat_feed_syncs",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_intelligence_sources.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="RUNNING"),
            sa.Column("records_received", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("records_valid", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("records_invalid", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("records_added", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("records_updated", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("records_skipped", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("raw_payload_hash", sa.String(128), nullable=True),
        )

    # 3. threat_intelligence_objects
    if "threat_intelligence_objects" not in tables:
        op.create_table(
            "threat_intelligence_objects",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("object_type", sa.String(64), nullable=False, index=True),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("external_id", sa.String(255), nullable=True, index=True),
            sa.Column("title", sa.String(512), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("severity", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
            sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("tags", sa.JSON(), nullable=True),
            sa.Column("labels", sa.JSON(), nullable=True),
            sa.Column("references", sa.JSON(), nullable=True),
            sa.Column("raw_data_reference", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 4. threat_indicators
    if "threat_indicators" not in tables:
        op.create_table(
            "threat_indicators",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("indicator_type", sa.String(64), nullable=False, index=True),
            sa.Column("value", sa.String(1024), nullable=False, index=True),
            sa.Column("normalized_value", sa.String(1024), nullable=False, index=True),
            sa.Column("title", sa.String(512), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("severity", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("status", sa.String(32), nullable=False, server_default="ACTIVE"),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
            sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("source_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("threat_types", sa.JSON(), nullable=True),
            sa.Column("raw_data_reference", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_threat_indicators_type_val", "threat_indicators", ["indicator_type", "normalized_value"], unique=True)
        op.create_index("ix_threat_indicators_status_until", "threat_indicators", ["status", "valid_until"])

    # 5. threat_indicator_sources
    if "threat_indicator_sources" not in tables:
        op.create_table(
            "threat_indicator_sources",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("indicator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_intelligence_sources.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("external_reference", sa.String(255), nullable=True),
            sa.Column("reported_confidence", sa.String(32), nullable=True),
            sa.Column("reported_severity", sa.String(32), nullable=True),
            sa.Column("first_reported", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_reported", sa.DateTime(timezone=True), nullable=True),
            sa.Column("raw_payload", sa.JSON(), nullable=True),
            sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_indicator_sources_unique", "threat_indicator_sources", ["indicator_id", "source_id"], unique=True)

    # 6. threat_actors
    if "threat_actors" not in tables:
        op.create_table(
            "threat_actors",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False, unique=True, index=True),
            sa.Column("aliases", sa.JSON(), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("country", sa.String(128), nullable=True),
            sa.Column("motivation", sa.String(128), nullable=True),
            sa.Column("targeting", sa.JSON(), nullable=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("references", sa.JSON(), nullable=True),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 7. threat_campaigns
    if "threat_campaigns" not in tables:
        op.create_table(
            "threat_campaigns",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False, unique=True, index=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_actors.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("objective", sa.String(255), nullable=True),
            sa.Column("targeting", sa.JSON(), nullable=True),
            sa.Column("techniques", sa.JSON(), nullable=True),
            sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("references", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 8. malware_families
    if "malware_families" not in tables:
        op.create_table(
            "malware_families",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False, unique=True, index=True),
            sa.Column("aliases", sa.JSON(), nullable=True),
            sa.Column("malware_type", sa.String(64), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("file_hashes", sa.JSON(), nullable=True),
            sa.Column("known_domains", sa.JSON(), nullable=True),
            sa.Column("known_ips", sa.JSON(), nullable=True),
            sa.Column("techniques", sa.JSON(), nullable=True),
            sa.Column("references", sa.JSON(), nullable=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 9. threat_techniques
    if "threat_techniques" not in tables:
        op.create_table(
            "threat_techniques",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("technique_id", sa.String(32), nullable=False, unique=True, index=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("tactic", sa.String(64), nullable=False, index=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("url", sa.String(512), nullable=True),
            sa.Column("detection_guidance", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 10. threat_reports
    if "threat_reports" not in tables:
        op.create_table(
            "threat_reports",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("title", sa.String(512), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_intelligence_sources.id", ondelete="SET NULL"), nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("report_url", sa.String(1024), nullable=True),
            sa.Column("extracted_indicators", sa.JSON(), nullable=True),
            sa.Column("extracted_actors", sa.JSON(), nullable=True),
            sa.Column("extracted_techniques", sa.JSON(), nullable=True),
            sa.Column("raw_data_reference", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 11. threat_relationships
    if "threat_relationships" not in tables:
        op.create_table(
            "threat_relationships",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("source_type", sa.String(64), nullable=False),
            sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("relationship_type", sa.String(64), nullable=False),
            sa.Column("target_type", sa.String(64), nullable=False),
            sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="MEDIUM"),
            sa.Column("source_provenance", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 12. threat_references
    if "threat_references" not in tables:
        op.create_table(
            "threat_references",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("target_type", sa.String(64), nullable=False),
            sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("source_name", sa.String(255), nullable=False),
            sa.Column("url", sa.String(1024), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 13. threat_tags
    if "threat_tags" not in tables:
        op.create_table(
            "threat_tags",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(128), nullable=False, unique=True, index=True),
            sa.Column("category", sa.String(64), nullable=False, server_default="GENERAL"),
            sa.Column("description", sa.Text(), nullable=True),
        )

    # 14. threat_matches
    if "threat_matches" not in tables:
        op.create_table(
            "threat_matches",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("indicator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("match_key", sa.String(64), nullable=False, unique=True, index=True),
            sa.Column("match_type", sa.String(64), nullable=False),
            sa.Column("observed_entity", sa.JSON(), nullable=False),
            sa.Column("observation_id", sa.String(128), nullable=True),
            sa.Column("environment", sa.String(64), nullable=False, server_default="PRODUCTION"),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("severity", sa.String(32), nullable=False, server_default="HIGH"),
            sa.Column("status", sa.String(32), nullable=False, server_default="NEW"),
            sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("evidence_id", sa.String(128), nullable=True),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("soc_alerts.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 15. threat_observations
    if "threat_observations" not in tables:
        op.create_table(
            "threat_observations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("indicator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("observation_type", sa.String(64), nullable=False),
            sa.Column("observed_value", sa.String(1024), nullable=False),
            sa.Column("observed_entity_id", sa.String(255), nullable=False),
            sa.Column("observed_entity_type", sa.String(64), nullable=False),
            sa.Column("observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("evidence_reference", sa.String(255), nullable=True),
            sa.Column("context", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 16. threat_suppressions
    if "threat_suppressions" not in tables:
        op.create_table(
            "threat_suppressions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("indicator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("threat_indicators.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True),
            sa.Column("scope", sa.String(64), nullable=False, server_default="PROJECT"),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("suppressed_by", sa.String(255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("threat_suppressions")
    op.drop_table("threat_observations")
    op.drop_table("threat_matches")
    op.drop_table("threat_tags")
    op.drop_table("threat_references")
    op.drop_table("threat_relationships")
    op.drop_table("threat_reports")
    op.drop_table("threat_techniques")
    op.drop_table("malware_families")
    op.drop_table("threat_campaigns")
    op.drop_table("threat_actors")
    op.drop_table("threat_indicator_sources")
    op.drop_table("threat_indicators")
    op.drop_table("threat_intelligence_objects")
    op.drop_table("threat_feed_syncs")
    op.drop_table("threat_intelligence_sources")
