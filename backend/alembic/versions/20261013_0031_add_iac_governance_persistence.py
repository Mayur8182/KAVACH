"""add_iac_governance_persistence

Revision ID: 20261013_0031
Revises: 20261004_0030
Create Date: 2026-10-13

Adds authoritative PostgreSQL persistence tables for IaC Security:
  iac_quality_gates      — real persistence for quality gates, rule criteria, repo enforcement
  iac_policy_exceptions  — real persistence for policy exceptions, valid until, status
  iac_custom_rules       — real persistence for custom Rego rules and rule status overrides
  iac_settings           — real persistence for global and section IaC settings
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261013_0031"
down_revision = "20261004_0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── iac_quality_gates ──────────────────────────────────────────────────────────
    op.create_table(
        "iac_quality_gates",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("status", sa.String(50), nullable=False, server_default="Enforced", index=True),
        sa.Column("fail_condition", sa.String(255), nullable=False, server_default="Critical findings > 0"),
        sa.Column("affected_repos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_by", sa.String(255), nullable=False, server_default="Security Engineer"),
        sa.Column("last_updated", sa.String(100), nullable=False, server_default=""),
        sa.Column("rules_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("repositories_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("pipelines_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("notifications_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("audit_logs_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── iac_policy_exceptions ──────────────────────────────────────────────────────
    op.create_table(
        "iac_policy_exceptions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("repository_name", sa.String(255), nullable=False, server_default="frontend-app", index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("policy_rule", sa.String(255), nullable=False, index=True),
        sa.Column("reason", sa.Text, nullable=False, server_default=""),
        sa.Column("valid_until", sa.String(100), nullable=False, server_default=""),
        sa.Column("status", sa.String(50), nullable=False, server_default="Active", index=True),
        sa.Column("created_by", sa.String(255), nullable=False, server_default="SecOps Admin"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── iac_custom_rules ───────────────────────────────────────────────────────────
    op.create_table(
        "iac_custom_rules",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("severity", sa.String(30), nullable=False, server_default="High", index=True),
        sa.Column("provider", sa.String(50), nullable=False, server_default="AWS", index=True),
        sa.Column("framework", sa.String(50), nullable=False, server_default="Terraform", index=True),
        sa.Column("rego_code", sa.Text, nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False, server_default="Enabled", index=True),
        sa.Column("is_custom", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── iac_settings ───────────────────────────────────────────────────────────────
    op.create_table(
        "iac_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("section", sa.String(100), nullable=False, index=True),
        sa.Column("config_data", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("iac_settings")
    op.drop_table("iac_custom_rules")
    op.drop_table("iac_policy_exceptions")
    op.drop_table("iac_quality_gates")
