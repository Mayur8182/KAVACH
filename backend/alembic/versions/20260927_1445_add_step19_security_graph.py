"""add_step19_security_graph

Revision ID: 20260927_1445
Revises: 20260927_1430
Create Date: 2026-09-27 14:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_1445"
down_revision: Union[str, None] = "20260927_1430"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_graph_nodes
    op.create_table(
        "security_graph_nodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("node_type", sa.String(), nullable=False, index=True),
        sa.Column("external_id", sa.String(), nullable=False, index=True),
        sa.Column("provider", sa.String(), nullable=False, server_default="PLATFORM", index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("resource_type", sa.String(), nullable=True, index=True),
        sa.Column("environment", sa.String(), nullable=False, server_default="PRODUCTION", index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE", index=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False, index=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("valid_from", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_graph_node_project_ext", "security_graph_nodes", ["project_id", "external_id"])
    op.create_index("ix_graph_node_project_type", "security_graph_nodes", ["project_id", "node_type"])

    # 2. security_graph_edges
    op.create_table(
        "security_graph_edges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_graph_nodes.id"), nullable=False, index=True),
        sa.Column("target_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_graph_nodes.id"), nullable=False, index=True),
        sa.Column("edge_type", sa.String(), nullable=False, index=True),
        sa.Column("state", sa.String(), nullable=False, server_default="CONFIGURED_ACCESS", index=True),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("evidence_id", sa.String(), nullable=True, index=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_graph_edge_src_tgt", "security_graph_edges", ["source_node_id", "target_node_id"])
    op.create_index("ix_graph_edge_type_state", "security_graph_edges", ["edge_type", "state"])
    op.create_index("ix_graph_edge_temporal", "security_graph_edges", ["valid_from", "valid_until"])

    # 3. graph_attack_paths
    op.create_table(
        "graph_attack_paths",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("source_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_graph_nodes.id"), nullable=False, index=True),
        sa.Column("target_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("security_graph_nodes.id"), nullable=False, index=True),
        sa.Column("path_type", sa.String(), nullable=False, index=True),
        sa.Column("state", sa.String(), nullable=False, server_default="POTENTIAL", index=True),
        sa.Column("severity_context", sa.String(), nullable=False, server_default="HIGH", index=True),
        sa.Column("path_length", sa.Integer(), nullable=False),
        sa.Column("hops", sa.JSON(), nullable=False),
        sa.Column("conditions", sa.JSON(), nullable=False),
        sa.Column("evidence_ids", sa.JSON(), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. security_change_impact
    op.create_table(
        "security_change_impact",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("trigger_type", sa.String(), nullable=False, index=True),
        sa.Column("trigger_id", sa.String(), nullable=False, index=True),
        sa.Column("affected_nodes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("directly_affected", sa.JSON(), nullable=True),
        sa.Column("indirectly_affected", sa.JSON(), nullable=True),
        sa.Column("affected_requirements", sa.JSON(), nullable=True),
        sa.Column("affected_contracts", sa.JSON(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 5. security_graph_snapshots
    op.create_table(
        "security_graph_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("source_event_id", sa.String(), nullable=True),
        sa.Column("node_count", sa.Integer(), nullable=False),
        sa.Column("edge_count", sa.Integer(), nullable=False),
        sa.Column("snapshot_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 6. security_graph_versions
    op.create_table(
        "security_graph_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("change_summary", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 7. graph_analysis_jobs
    op.create_table(
        "graph_analysis_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("analysis_type", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False, server_default="QUEUED", index=True),
        sa.Column("parameters", sa.JSON(), nullable=True),
        sa.Column("result_summary", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("graph_analysis_jobs")
    op.drop_table("security_graph_versions")
    op.drop_table("security_graph_snapshots")
    op.drop_table("security_change_impact")
    op.drop_table("graph_attack_paths")
    op.drop_table("security_graph_edges")
    op.drop_table("security_graph_nodes")
