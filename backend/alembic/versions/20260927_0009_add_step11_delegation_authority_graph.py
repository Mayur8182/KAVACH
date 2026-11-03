"""add_step11_delegation_authority_graph

Revision ID: 20260927_0009
Revises: 20260927_0008
Create Date: 2026-09-27 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_0009'
down_revision: Union[str, None] = '20260927_0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. delegations
    op.create_table(
        'delegations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('delegator_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('delegate_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('allow_further_delegation', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('authority_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_by_type', sa.String(length=50), nullable=False, server_default='USER'),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_approvals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_by', sa.String(length=100), nullable=True),
        sa.Column('revocation_reason', sa.Text(), nullable=True),
        sa.Column('parent_delegation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('delegations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('delegation_depth', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_delegations_delegator_status', 'delegations', ['delegator_agent_id', 'status'])
    op.create_index('ix_delegations_delegate_status', 'delegations', ['delegate_agent_id', 'status'])
    op.create_index('ix_delegations_project_status', 'delegations', ['project_id', 'status'])
    op.create_index('ix_delegations_expires_at', 'delegations', ['expires_at'])

    # 2. agent_authority_edges
    op.create_table(
        'agent_authority_edges',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('delegation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('delegations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('authority', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('depth', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index('ix_authority_edges_source_target', 'agent_authority_edges', ['source_agent_id', 'target_agent_id', 'status'])
    op.create_index('ix_authority_edges_delegation_id', 'agent_authority_edges', ['delegation_id'])
    op.create_index('ix_authority_edges_project_id', 'agent_authority_edges', ['project_id'])

    # 3. agent_data_flows
    op.create_table(
        'agent_data_flows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('destination_agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_type', sa.String(length=100), nullable=False),
        sa.Column('classification', sa.String(length=50), nullable=False, server_default='INTERNAL'),
        sa.Column('source_resource_type', sa.String(length=100), nullable=False),
        sa.Column('source_resource_id', sa.String(length=255), nullable=True),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('decision', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('reason_code', sa.String(length=100), nullable=False, server_default='PENDING_EVALUATION'),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_approvals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_data_flows_agents', 'agent_data_flows', ['source_agent_id', 'destination_agent_id', 'status'])
    op.create_index('ix_data_flows_project_id', 'agent_data_flows', ['project_id'])
    op.create_index('ix_data_flows_classification', 'agent_data_flows', ['classification'])


def downgrade() -> None:
    op.drop_table('agent_data_flows')
    op.drop_table('agent_authority_edges')
    op.drop_table('delegations')
