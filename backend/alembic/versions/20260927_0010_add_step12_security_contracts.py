"""add_step12_security_contracts

Revision ID: 20260927_0010
Revises: 20260927_0009
Create Date: 2026-09-27 01:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_0010'
down_revision: Union[str, None] = '20260927_0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_contracts
    op.create_table(
        'security_contracts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('contract_key', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('current_version_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('project_id', 'contract_key', name='uq_project_contract_key'),
    )
    op.create_index('ix_security_contracts_project_id', 'security_contracts', ['project_id'])
    op.create_index('ix_security_contracts_project_status', 'security_contracts', ['project_id', 'status'])

    # 2. security_contract_versions
    op.create_table(
        'security_contract_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contracts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('definition', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('normalized_definition', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('definition_hash', sa.String(length=64), nullable=False),
        sa.Column('schema_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('methodology_version', sa.String(length=50), nullable=False, server_default='2026.1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('contract_id', 'version', name='uq_contract_version'),
    )
    op.create_index('ix_contract_versions_contract_id', 'security_contract_versions', ['contract_id'])
    op.create_index('ix_contract_versions_status', 'security_contract_versions', ['status'])
    op.create_index('ix_contract_versions_hash', 'security_contract_versions', ['definition_hash'])

    # 3. security_contract_scopes
    op.create_table(
        'security_contract_scopes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scope_type', sa.String(length=50), nullable=False),
        sa.Column('scope_id', sa.String(length=255), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=True),
        sa.Column('branch', sa.String(length=255), nullable=True),
        sa.Column('resource_type', sa.String(length=100), nullable=True),
        sa.Column('resource_scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_security_contract_scopes_version_id', 'security_contract_scopes', ['contract_version_id'])

    # 4. security_contract_dependencies
    op.create_table(
        'security_contract_dependencies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('depends_on_contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('dependency_type', sa.String(length=50), nullable=False, server_default='REQUIRES'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_contract_deps_version_id', 'security_contract_dependencies', ['contract_version_id'])
    op.create_index('ix_contract_deps_depends_on_id', 'security_contract_dependencies', ['depends_on_contract_version_id'])

    # 5. security_contract_evidence_requirements
    op.create_table(
        'security_contract_evidence_requirements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('evidence_type', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='SYSTEM'),
        sa.Column('required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('minimum_confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('configuration', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_contract_evidence_reqs_version_id', 'security_contract_evidence_requirements', ['contract_version_id'])

    # 6. security_contract_verifications
    op.create_table(
        'security_contract_verifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('evaluation_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('evidence_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('verifier_type', sa.String(length=100), nullable=False, server_default='CONTRACT_EVALUATOR'),
        sa.Column('verifier_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('evaluation_started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('evaluation_completed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('error_message', sa.Text(), nullable=True),
    )
    op.create_index('ix_contract_verifications_version_id', 'security_contract_verifications', ['contract_version_id'])
    op.create_index('ix_contract_verifications_project_id', 'security_contract_verifications', ['project_id'])

    # 7. security_contract_violations
    op.create_table(
        'security_contract_violations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_verifications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('violation_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('resource', sa.String(length=255), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=True),
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_reference', sa.String(length=255), nullable=True),
    )
    op.create_index('ix_contract_violations_version_id', 'security_contract_violations', ['contract_version_id'])
    op.create_index('ix_contract_violations_verification_id', 'security_contract_violations', ['verification_id'])
    op.create_index('ix_contract_violations_project_id', 'security_contract_violations', ['project_id'])

    # 8. security_contract_overrides
    op.create_table(
        'security_contract_overrides',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_type', sa.String(length=50), nullable=False, server_default='USER'),
        sa.Column('actor_id', sa.String(length=255), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
    )
    op.create_index('ix_contract_overrides_version_id', 'security_contract_overrides', ['contract_version_id'])
    op.create_index('ix_contract_overrides_project_id', 'security_contract_overrides', ['project_id'])


def downgrade() -> None:
    op.drop_table('security_contract_overrides')
    op.drop_table('security_contract_violations')
    op.drop_table('security_contract_verifications')
    op.drop_table('security_contract_evidence_requirements')
    op.drop_table('security_contract_dependencies')
    op.drop_table('security_contract_scopes')
    op.drop_table('security_contract_versions')
    op.drop_table('security_contracts')
