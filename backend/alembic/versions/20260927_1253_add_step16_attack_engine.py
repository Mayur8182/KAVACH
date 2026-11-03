"""add_step16_attack_engine

Revision ID: 20260927_1253
Revises: b65b44c4a6d2
Create Date: 2026-09-27 12:53:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_1253'
down_revision: Union[str, None] = 'b65b44c4a6d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # security_attack_targets
    op.create_table(
        'security_attack_targets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_type', sa.String(), nullable=False),
        sa.Column('target_identifier', sa.String(), nullable=False),
        sa.Column('environment', sa.String(), nullable=False),
        sa.Column('base_url', sa.String(), nullable=True),
        sa.Column('repository_id', sa.String(), nullable=True),
        sa.Column('commit_sha', sa.String(), nullable=True),
        sa.Column('service_id', sa.String(), nullable=True),
        sa.Column('container_id', sa.String(), nullable=True),
        sa.Column('kubernetes_namespace', sa.String(), nullable=True),
        sa.Column('kubernetes_workload', sa.String(), nullable=True),
        sa.Column('scope', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='ACTIVE'),
        sa.Column('authorization', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_security_attack_targets_project_id'), 'security_attack_targets', ['project_id'], unique=False)

    # security_attack_campaigns
    op.create_table(
        'security_attack_campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='DRAFT'),
        sa.Column('environment', sa.String(), nullable=False),
        sa.Column('target_type', sa.String(), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_type', sa.String(), nullable=False),
        sa.Column('created_by_id', sa.String(), nullable=False),
        sa.Column('policy_decision_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('authorization_context', sa.JSON(), nullable=True),
        sa.Column('scope', sa.JSON(), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['target_id'], ['security_attack_targets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_security_attack_campaigns_project_id'), 'security_attack_campaigns', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_attack_campaigns_status'), 'security_attack_campaigns', ['status'], unique=False)

    # security_attack_tests
    op.create_table(
        'security_attack_tests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('test_type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('target_type', sa.String(), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('environment', sa.String(), nullable=False),
        sa.Column('authorization_scope', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='PLANNED'),
        sa.Column('expected_behavior', sa.JSON(), nullable=True),
        sa.Column('actual_behavior', sa.JSON(), nullable=True),
        sa.Column('oracle_result', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['security_attack_campaigns.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['target_id'], ['security_attack_targets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_security_attack_tests_campaign_id'), 'security_attack_tests', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_security_attack_tests_requirement_id'), 'security_attack_tests', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_security_attack_tests_contract_version_id'), 'security_attack_tests', ['contract_version_id'], unique=False)
    op.create_index(op.f('ix_security_attack_tests_status'), 'security_attack_tests', ['status'], unique=False)

    # attack_test_evidence
    op.create_table(
        'attack_test_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attack_test_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evidence_type', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('content_reference', sa.String(), nullable=True),
        sa.Column('content_hash', sa.String(), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('request_reference', sa.String(), nullable=True),
        sa.Column('response_reference', sa.String(), nullable=True),
        sa.Column('trace_id', sa.String(), nullable=True),
        sa.Column('log_reference', sa.String(), nullable=True),
        sa.Column('before_state', sa.JSON(), nullable=True),
        sa.Column('after_state', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['attack_test_id'], ['security_attack_tests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # security_attack_results
    op.create_table(
        'security_attack_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attack_test_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('result', sa.String(), nullable=False),
        sa.Column('oracle_type', sa.String(), nullable=False),
        sa.Column('expected_behavior', sa.JSON(), nullable=True),
        sa.Column('actual_behavior', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('evidence_ids', sa.JSON(), nullable=True),
        sa.Column('requirement_status_before', sa.String(), nullable=True),
        sa.Column('requirement_status_after', sa.String(), nullable=True),
        sa.Column('contract_status_before', sa.String(), nullable=True),
        sa.Column('contract_status_after', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['attack_test_id'], ['security_attack_tests.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('attack_test_id')
    )

    # security_attack_paths
    op.create_table(
        'security_attack_paths',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attack_test_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('path_nodes', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['attack_test_id'], ['security_attack_tests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('security_attack_paths')
    op.drop_table('security_attack_results')
    op.drop_table('attack_test_evidence')
    
    op.drop_index(op.f('ix_security_attack_tests_status'), table_name='security_attack_tests')
    op.drop_index(op.f('ix_security_attack_tests_contract_version_id'), table_name='security_attack_tests')
    op.drop_index(op.f('ix_security_attack_tests_requirement_id'), table_name='security_attack_tests')
    op.drop_index(op.f('ix_security_attack_tests_campaign_id'), table_name='security_attack_tests')
    op.drop_table('security_attack_tests')
    
    op.drop_index(op.f('ix_security_attack_campaigns_status'), table_name='security_attack_campaigns')
    op.drop_index(op.f('ix_security_attack_campaigns_project_id'), table_name='security_attack_campaigns')
    op.drop_table('security_attack_campaigns')
    
    op.drop_index(op.f('ix_security_attack_targets_project_id'), table_name='security_attack_targets')
    op.drop_table('security_attack_targets')
