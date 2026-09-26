"""add_policies_decisions_approvals

Revision ID: 20260926_0005
Revises: 20260926_0004
Create Date: 2026-09-26 21:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0005'
down_revision: Union[str, None] = '20260926_0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_policies
    op.create_table(
        'security_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('scope', sa.String(length=50), server_default='PROJECT', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='100', nullable=False),
        sa.Column('policy_type', sa.String(length=50), server_default='SECURITY', nullable=False),
        sa.Column('current_version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('effective_from', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('effective_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_policies_project_id'), 'security_policies', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_policies_name'), 'security_policies', ['name'], unique=False)
    op.create_index(op.f('ix_security_policies_status'), 'security_policies', ['status'], unique=False)

    # 2. security_policy_versions
    op.create_table(
        'security_policy_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_policies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('definition', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), server_default='true', nullable=False),
        sa.UniqueConstraint('policy_id', 'version', name='uq_policy_version'),
    )
    op.create_index(op.f('ix_security_policy_versions_policy_id'), 'security_policy_versions', ['policy_id'], unique=False)

    # 3. security_decisions
    op.create_table(
        'security_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_type', sa.String(length=50), server_default='USER', nullable=False),
        sa.Column('actor_id', sa.String(length=100), nullable=False),
        sa.Column('operation_type', sa.String(length=50), nullable=False),
        sa.Column('operation_id', sa.String(length=100), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('environment', sa.String(length=50), server_default='development', nullable=False),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('policy_version_ids', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('blueprint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_blueprints.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_scans.id', ondelete='SET NULL'), nullable=True),
        sa.Column('context_snapshot', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_decisions_project_id'), 'security_decisions', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_decisions_decision'), 'security_decisions', ['decision'], unique=False)
    op.create_index(op.f('ix_security_decisions_created_at'), 'security_decisions', ['created_at'], unique=False)

    # 4. decision_evidence
    op.create_table(
        'decision_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('decision_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_decisions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('evidence_type', sa.String(length=50), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=100), nullable=True),
        sa.Column('attribute', sa.String(length=100), nullable=False),
        sa.Column('observed_value', sa.JSON(), nullable=False),
        sa.Column('expected_condition', sa.String(length=255), nullable=False),
        sa.Column('effect', sa.String(length=50), nullable=False),
        sa.Column('rule_name', sa.String(length=100), nullable=True),
        sa.Column('policy_version_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_decision_evidence_decision_id'), 'decision_evidence', ['decision_id'], unique=False)

    # 5. security_approvals
    op.create_table(
        'security_approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('decision_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_decisions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False),
        sa.Column('requested_by', sa.String(length=100), nullable=False),
        sa.Column('approved_by', sa.String(length=100), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('approval_notes', sa.Text(), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_approvals_decision_id'), 'security_approvals', ['decision_id'], unique=False)
    op.create_index(op.f('ix_security_approvals_status'), 'security_approvals', ['status'], unique=False)


def downgrade() -> None:
    op.drop_table('security_approvals')
    op.drop_table('decision_evidence')
    op.drop_table('security_decisions')
    op.drop_table('security_policy_versions')
    op.drop_table('security_policies')
