"""add_step10_agent_authorization

Revision ID: 20260927_0008
Revises: 20260926_0007
Create Date: 2026-09-27 00:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_0008'
down_revision: Union[str, None] = '20260926_0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. agent_credentials
    op.create_table(
        'agent_credentials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('credential_type', sa.String(length=50), nullable=False, server_default='API_KEY'),
        sa.Column('credential_prefix', sa.String(length=50), nullable=False),
        sa.Column('secret_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False, server_default='Default Credential'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revocation_reason', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agent_credentials_agent_id', 'agent_credentials', ['agent_id'])
    op.create_index('ix_agent_credentials_credential_prefix', 'agent_credentials', ['credential_prefix'])
    op.create_index('ix_agent_credentials_status', 'agent_credentials', ['status'])

    # 2. roles
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_roles_name', 'roles', ['name'], unique=True)

    # 3. permissions
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False, server_default='LOW'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_permissions_name', 'permissions', ['name'], unique=True)
    op.create_index('ix_permissions_resource_type', 'permissions', ['resource_type'])
    op.create_index('ix_permissions_action', 'permissions', ['action'])

    # 4. role_permissions
    op.create_table(
        'role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    )

    # 5. agent_roles
    op.create_table(
        'agent_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agent_roles_agent_id', 'agent_roles', ['agent_id'])
    op.create_index('ix_agent_roles_role_id', 'agent_roles', ['role_id'])

    # 6. agent_permission_overrides
    op.create_table(
        'agent_permission_overrides',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('effect', sa.String(length=20), nullable=False, server_default='DENY'),
        sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agent_permission_overrides_agent_id', 'agent_permission_overrides', ['agent_id'])
    op.create_index('ix_agent_permission_overrides_permission_id', 'agent_permission_overrides', ['permission_id'])

    # 7. authorization_decisions
    op.create_table(
        'authorization_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('principal_type', sa.String(length=50), nullable=False, server_default='AGENT'),
        sa.Column('principal_id', sa.String(length=100), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=False, server_default='development'),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('reason_code', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('permission_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('scope_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_authorization_decisions_principal_id', 'authorization_decisions', ['principal_id'])
    op.create_index('ix_authorization_decisions_agent_id', 'authorization_decisions', ['agent_id'])
    op.create_index('ix_authorization_decisions_project_id', 'authorization_decisions', ['project_id'])
    op.create_index('ix_authorization_decisions_decision', 'authorization_decisions', ['decision'])
    op.create_index('ix_authorization_decisions_reason_code', 'authorization_decisions', ['reason_code'])
    op.create_index('ix_authorization_decisions_action', 'authorization_decisions', ['action'])
    op.create_index('ix_authorization_decisions_resource_type', 'authorization_decisions', ['resource_type'])
    op.create_index('ix_authorization_decisions_created_at', 'authorization_decisions', ['created_at'])

    # 8. Alter mcp_sessions
    op.add_column('mcp_sessions', sa.Column('credential_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agent_credentials.id', ondelete='SET NULL'), nullable=True))
    op.add_column('mcp_sessions', sa.Column('principal_id', sa.String(length=255), nullable=True))
    op.create_index('ix_mcp_sessions_credential_id', 'mcp_sessions', ['credential_id'])
    op.create_index('ix_mcp_sessions_principal_id', 'mcp_sessions', ['principal_id'])

    # 9. Alter mcp_tools
    op.add_column('mcp_tools', sa.Column('required_permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('mcp_tools', sa.Column('allowed_resource_types', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column('mcp_tools', sa.Column('minimum_trust_level', sa.String(length=50), nullable=False, server_default='LOW'))
    op.add_column('mcp_tools', sa.Column('approval_mode', sa.String(length=50), nullable=False, server_default='STANDARD'))


def downgrade() -> None:
    op.drop_column('mcp_tools', 'approval_mode')
    op.drop_column('mcp_tools', 'minimum_trust_level')
    op.drop_column('mcp_tools', 'allowed_resource_types')
    op.drop_column('mcp_tools', 'required_permissions')

    op.drop_index('ix_mcp_sessions_principal_id', table_name='mcp_sessions')
    op.drop_index('ix_mcp_sessions_credential_id', table_name='mcp_sessions')
    op.drop_column('mcp_sessions', 'principal_id')
    op.drop_column('mcp_sessions', 'credential_id')

    op.drop_table('authorization_decisions')
    op.drop_table('agent_permission_overrides')
    op.drop_table('agent_roles')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('agent_credentials')
