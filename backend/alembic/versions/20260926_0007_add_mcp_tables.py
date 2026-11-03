"""add_mcp_tables

Revision ID: 20260926_0007
Revises: 20260926_0006
Create Date: 2026-09-26 23:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0007'
down_revision: Union[str, None] = '20260926_0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. mcp_tools table
    op.create_table(
        'mcp_tools',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('input_schema', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('output_schema', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False, server_default='LOW'),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('required_permission', sa.String(length=100), nullable=False, server_default='PROJECT_READ'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_mcp_tools_name', 'mcp_tools', ['name'], unique=True)
    op.create_index('ix_mcp_tools_category', 'mcp_tools', ['category'])
    op.create_index('ix_mcp_tools_enabled', 'mcp_tools', ['enabled'])

    # 2. mcp_sessions table
    op.create_table(
        'mcp_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('authenticated_principal', sa.String(length=255), nullable=False),
        sa.Column('transport', sa.String(length=50), nullable=False, server_default='stdio'),
        sa.Column('client_name', sa.String(length=255), nullable=False, server_default='unknown-mcp-client'),
        sa.Column('client_version', sa.String(length=100), nullable=False, server_default='1.0.0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('terminated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_mcp_sessions_agent_id', 'mcp_sessions', ['agent_id'])
    op.create_index('ix_mcp_sessions_project_id', 'mcp_sessions', ['project_id'])
    op.create_index('ix_mcp_sessions_status', 'mcp_sessions', ['status'])

    # 3. mcp_tool_invocations table
    op.create_table(
        'mcp_tool_invocations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mcp_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tool_name', sa.String(length=100), nullable=False),
        sa.Column('tool_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('request_id', sa.String(length=100), nullable=False),
        sa.Column('operation', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('authorization_decision', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('policy_decision', sa.String(length=50), nullable=False, server_default='NOT_EVALUATED'),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result_reference', sa.Text(), nullable=True),
        sa.Column('input_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('output_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_mcp_tool_invocations_session_id', 'mcp_tool_invocations', ['session_id'])
    op.create_index('ix_mcp_tool_invocations_agent_id', 'mcp_tool_invocations', ['agent_id'])
    op.create_index('ix_mcp_tool_invocations_project_id', 'mcp_tool_invocations', ['project_id'])
    op.create_index('ix_mcp_tool_invocations_tool_name', 'mcp_tool_invocations', ['tool_name'])
    op.create_index('ix_mcp_tool_invocations_status', 'mcp_tool_invocations', ['status'])
    op.create_index('ix_mcp_tool_invocations_request_id', 'mcp_tool_invocations', ['request_id'])

    # 4. mcp_resources table
    op.create_table(
        'mcp_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uri', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False, server_default='application/json'),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_mcp_resources_uri', 'mcp_resources', ['uri'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_mcp_resources_uri', table_name='mcp_resources')
    op.drop_table('mcp_resources')

    op.drop_index('ix_mcp_tool_invocations_request_id', table_name='mcp_tool_invocations')
    op.drop_index('ix_mcp_tool_invocations_status', table_name='mcp_tool_invocations')
    op.drop_index('ix_mcp_tool_invocations_tool_name', table_name='mcp_tool_invocations')
    op.drop_index('ix_mcp_tool_invocations_project_id', table_name='mcp_tool_invocations')
    op.drop_index('ix_mcp_tool_invocations_agent_id', table_name='mcp_tool_invocations')
    op.drop_index('ix_mcp_tool_invocations_session_id', table_name='mcp_tool_invocations')
    op.drop_table('mcp_tool_invocations')

    op.drop_index('ix_mcp_sessions_status', table_name='mcp_sessions')
    op.drop_index('ix_mcp_sessions_project_id', table_name='mcp_sessions')
    op.drop_index('ix_mcp_sessions_agent_id', table_name='mcp_sessions')
    op.drop_table('mcp_sessions')

    op.drop_index('ix_mcp_tools_enabled', table_name='mcp_tools')
    op.drop_index('ix_mcp_tools_category', table_name='mcp_tools')
    op.drop_index('ix_mcp_tools_name', table_name='mcp_tools')
    op.drop_table('mcp_tools')
