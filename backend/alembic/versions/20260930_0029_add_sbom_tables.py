"""add_sbom_tables

Revision ID: 20260930_0029
Revises: 20260927_2200_add_step28_agent_governance
Create Date: 2026-09-30

Adds:
  sbom_jobs        — tracks real Syft execution (QUEUED→RUNNING→COMPLETED/FAILED)
  sbom_documents   — parsed SBOM document with denormalized counters
  sbom_components  — normalized per-artifact rows for server-side pagination/filtering
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "20260930_0029"
down_revision = "20260927_2200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── sbom_jobs ─────────────────────────────────────────────────────────────
    op.create_table(
        "sbom_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requested_by", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="QUEUED"),
        sa.Column("target_path", sa.String(1000), nullable=True),
        sa.Column("target_ref", sa.String(255), nullable=True),
        sa.Column("sbom_format", sa.String(50), nullable=False, server_default="cyclonedx-json"),
        sa.Column("syft_version", sa.String(50), nullable=True),
        sa.Column("syft_command", sa.Text, nullable=True),
        sa.Column("exit_code", sa.Integer, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("stderr_output", sa.Text, nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_sbom_jobs_project_id", "sbom_jobs", ["project_id"])
    op.create_index("ix_sbom_jobs_status", "sbom_jobs", ["status"])
    op.create_index("ix_sbom_jobs_project_status", "sbom_jobs", ["project_id", "status"])

    # ── sbom_documents ────────────────────────────────────────────────────────
    op.create_table(
        "sbom_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sbom_jobs.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sbom_format", sa.String(50), nullable=False),
        sa.Column("sbom_spec_version", sa.String(20), nullable=True),
        sa.Column("source_name", sa.String(500), nullable=True),
        sa.Column("source_version", sa.String(255), nullable=True),
        # Denormalized counters
        sa.Column("total_components", sa.Integer, nullable=False, server_default="0"),
        sa.Column("vulnerable_components", sa.Integer, nullable=False, server_default="0"),
        sa.Column("open_source_licenses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("high_risk_licenses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("critical_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("high_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("medium_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("low_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("info_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("raw_content", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_sbom_documents_project_id", "sbom_documents", ["project_id"])
    op.create_index(
        "ix_sbom_documents_project_created",
        "sbom_documents",
        ["project_id", "created_at"],
    )

    # ── sbom_components ───────────────────────────────────────────────────────
    op.create_table(
        "sbom_components",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sbom_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("version", sa.String(255), nullable=True),
        sa.Column("component_type", sa.String(50), nullable=False, server_default="library"),
        sa.Column("purl", sa.String(1000), nullable=True),
        sa.Column("cpe", sa.String(1000), nullable=True),
        sa.Column("license_name", sa.String(255), nullable=True),
        sa.Column("license_expression", sa.String(500), nullable=True),
        sa.Column("is_high_risk_license", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("vuln_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("vuln_critical", sa.Integer, nullable=False, server_default="0"),
        sa.Column("vuln_high", sa.Integer, nullable=False, server_default="0"),
        sa.Column("vuln_medium", sa.Integer, nullable=False, server_default="0"),
        sa.Column("vuln_low", sa.Integer, nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="Low"),
        sa.Column("component_status", sa.String(30), nullable=False, server_default="Safe"),
        sa.Column("raw_metadata", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_sbom_components_document_id", "sbom_components", ["document_id"])
    op.create_index("ix_sbom_components_project_id", "sbom_components", ["project_id"])
    op.create_index("ix_sbom_components_name", "sbom_components", ["name"])
    op.create_index("ix_sbom_components_type", "sbom_components", ["component_type"])
    op.create_index("ix_sbom_components_risk", "sbom_components", ["risk_level"])
    op.create_index("ix_sbom_components_status", "sbom_components", ["component_status"])
    op.create_index(
        "ix_sbom_components_doc_name", "sbom_components", ["document_id", "name"]
    )
    op.create_index(
        "ix_sbom_components_doc_type", "sbom_components", ["document_id", "component_type"]
    )
    op.create_index(
        "ix_sbom_components_doc_risk", "sbom_components", ["document_id", "risk_level"]
    )


def downgrade() -> None:
    op.drop_table("sbom_components")
    op.drop_table("sbom_documents")
    op.drop_table("sbom_jobs")
