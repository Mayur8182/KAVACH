"""add_step13_runtime_evidence

Revision ID: 20260927_0011
Revises: 20260927_0010
Create Date: 2026-09-27 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_0011'
down_revision: Union[str, None] = '20260927_0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. runtime_evidence_sources
    op.create_table(
        'runtime_evidence_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('configuration', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_event_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_evidence_sources_project_id', 'runtime_evidence_sources', ['project_id'])
    op.create_index('ix_evidence_sources_project_status', 'runtime_evidence_sources', ['project_id', 'status'])
    op.create_index('ix_evidence_sources_source_type', 'runtime_evidence_sources', ['source_type'])

    # 2. runtime_evidence
    op.create_table(
        'runtime_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_id', sa.String(length=100), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_id', sa.String(length=255), nullable=False),
        sa.Column('source_event_id', sa.String(length=255), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subject_type', sa.String(length=50), nullable=True),
        sa.Column('subject_id', sa.String(length=255), nullable=True),
        sa.Column('action_type', sa.String(length=100), nullable=True),
        sa.Column('resource_type', sa.String(length=100), nullable=True),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('trace_id', sa.String(length=255), nullable=True),
        sa.Column('span_id', sa.String(length=255), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=True, server_default='production'),
        sa.Column('classification', sa.String(length=50), nullable=True, server_default='INTERNAL'),
        sa.Column('trust_level', sa.String(length=50), nullable=False, server_default='VALIDATED'),
        sa.Column('timestamp_quality', sa.String(length=50), nullable=False, server_default='SOURCE_REPORTED'),
        sa.Column('normalized_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('payload_hash', sa.String(length=64), nullable=False),
        sa.Column('schema_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('collector_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='RECEIVED'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_runtime_evidence_project_id', 'runtime_evidence', ['project_id'])
    op.create_index('ix_runtime_evidence_event_id', 'runtime_evidence', ['event_id'])
    op.create_index('ix_runtime_evidence_source_type', 'runtime_evidence', ['source_type'])
    op.create_index('ix_runtime_evidence_source_id', 'runtime_evidence', ['source_id'])
    op.create_index('ix_runtime_evidence_source_event_id', 'runtime_evidence', ['source_event_id'])
    op.create_index('ix_runtime_evidence_event_type', 'runtime_evidence', ['event_type'])
    op.create_index('ix_runtime_evidence_occurred_at', 'runtime_evidence', ['occurred_at'])
    op.create_index('ix_runtime_evidence_received_at', 'runtime_evidence', ['received_at'])
    op.create_index('ix_runtime_evidence_project_occurred', 'runtime_evidence', ['project_id', 'occurred_at'])
    op.create_index('ix_runtime_evidence_dedup', 'runtime_evidence', ['project_id', 'source_id', 'source_event_id'])
    op.create_index('ix_runtime_evidence_type_time', 'runtime_evidence', ['event_type', 'occurred_at'])

    # 3. evidence_checkpoints
    op.create_table(
        'evidence_checkpoints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runtime_evidence_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('cursor', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('last_event_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_event_id', sa.String(length=255), nullable=True),
        sa.Column('checkpoint_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_evidence_checkpoints_source_id', 'evidence_checkpoints', ['source_id'])
    op.create_index('ix_evidence_checkpoints_project_id', 'evidence_checkpoints', ['project_id'])

    # 4. evidence_correlations
    op.create_table(
        'evidence_correlations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('evidence_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runtime_evidence.id', ondelete='CASCADE'), nullable=False),
        sa.Column('correlation_type', sa.String(length=50), nullable=False),
        sa.Column('correlation_key', sa.String(length=255), nullable=False),
        sa.Column('related_resource_type', sa.String(length=100), nullable=True),
        sa.Column('related_resource_id', sa.String(length=255), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_evidence_correlations_project_id', 'evidence_correlations', ['project_id'])
    op.create_index('ix_evidence_correlations_evidence_id', 'evidence_correlations', ['evidence_id'])
    op.create_index('ix_evidence_correlations_type', 'evidence_correlations', ['correlation_type'])
    op.create_index('ix_evidence_correlations_key', 'evidence_correlations', ['correlation_key'])
    op.create_index('ix_evidence_corr_key_proj', 'evidence_correlations', ['project_id', 'correlation_key'])


def downgrade() -> None:
    op.drop_table('evidence_correlations')
    op.drop_table('evidence_checkpoints')
    op.drop_table('runtime_evidence')
    op.drop_table('runtime_evidence_sources')
