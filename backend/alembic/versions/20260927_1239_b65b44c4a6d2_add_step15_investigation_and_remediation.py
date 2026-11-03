"""add_step15_investigation_and_remediation

Revision ID: b65b44c4a6d2
Revises: 20260927_0012
Create Date: 2026-09-27 12:39:02.915148

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b65b44c4a6d2'
down_revision: Union[str, None] = '20260927_0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # security_investigations
    op.create_table(
        'security_investigations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('violation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('finding_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('priority', sa.String(), nullable=False),
        sa.Column('trigger_type', sa.String(), nullable=False),
        sa.Column('trigger_id', sa.String(), nullable=False),
        sa.Column('created_by_type', sa.String(), nullable=False),
        sa.Column('created_by_id', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_security_investigations_project_id'), 'security_investigations', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_investigations_status'), 'security_investigations', ['status'], unique=False)

    # investigation_evidence
    op.create_table(
        'investigation_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evidence_type', sa.String(), nullable=False),
        sa.Column('source_type', sa.String(), nullable=False),
        sa.Column('source_id', sa.String(), nullable=False),
        sa.Column('content_reference', sa.String(), nullable=True),
        sa.Column('content_hash', sa.String(), nullable=True),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('freshness', sa.String(), nullable=True),
        sa.Column('reliability', sa.String(), nullable=True),
        sa.Column('relevance', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['investigation_id'], ['security_investigations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # investigation_hypotheses
    op.create_table(
        'investigation_hypotheses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hypothesis', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('supporting_evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('contradicting_evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('validation_method', sa.String(), nullable=True),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['investigation_id'], ['security_investigations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_plans
    op.create_table(
        'remediation_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('risk_level', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_by_type', sa.String(), nullable=False),
        sa.Column('created_by_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['investigation_id'], ['security_investigations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_plan_versions
    op.create_table(
        'remediation_plan_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('plan_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('generated_by', sa.String(), nullable=True),
        sa.Column('provider', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['remediation_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_patches
    op.create_table(
        'remediation_patches',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('remediation_plan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('base_commit_sha', sa.String(), nullable=True),
        sa.Column('workspace_id', sa.String(), nullable=True),
        sa.Column('patch_format', sa.String(), nullable=False),
        sa.Column('original_hash', sa.String(), nullable=True),
        sa.Column('patched_hash', sa.String(), nullable=True),
        sa.Column('diff', sa.String(), nullable=False),
        sa.Column('affected_files', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_by', sa.String(), nullable=False),
        sa.Column('generation_model', sa.String(), nullable=True),
        sa.Column('generation_provider', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['investigation_id'], ['security_investigations.id'], ),
        sa.ForeignKeyConstraint(['remediation_plan_id'], ['remediation_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_validations
    op.create_table(
        'remediation_validations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patch_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('validation_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('command_or_tool', sa.String(), nullable=True),
        sa.Column('result_summary', sa.String(), nullable=True),
        sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['patch_id'], ['remediation_patches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_attempts
    op.create_table(
        'remediation_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patch_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_type', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('authorization_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('policy_decision_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['patch_id'], ['remediation_patches.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['remediation_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_reviews
    op.create_table(
        'remediation_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patch_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('review_type', sa.String(), nullable=False),
        sa.Column('result', sa.String(), nullable=False),
        sa.Column('observations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['patch_id'], ['remediation_patches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # remediation_evidence
    op.create_table(
        'remediation_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('remediation_attempt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evidence_type', sa.String(), nullable=False),
        sa.Column('content_reference', sa.String(), nullable=True),
        sa.Column('content_hash', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['remediation_attempt_id'], ['remediation_attempts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('remediation_evidence')
    op.drop_table('remediation_reviews')
    op.drop_table('remediation_attempts')
    op.drop_table('remediation_validations')
    op.drop_table('remediation_patches')
    op.drop_table('remediation_plan_versions')
    op.drop_table('remediation_plans')
    op.drop_table('investigation_hypotheses')
    op.drop_table('investigation_evidence')
    op.drop_index(op.f('ix_security_investigations_status'), table_name='security_investigations')
    op.drop_index(op.f('ix_security_investigations_project_id'), table_name='security_investigations')
    op.drop_table('security_investigations')
