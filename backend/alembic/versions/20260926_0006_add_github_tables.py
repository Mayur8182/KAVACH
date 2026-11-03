"""add_github_tables

Revision ID: 20260926_0006
Revises: 20260926_0005
Create Date: 2026-09-26 22:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0006'
down_revision: Union[str, None] = '20260926_0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. github_installations
    op.create_table(
        'github_installations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('github_installation_id', sa.BigInteger(), nullable=False),
        sa.Column('github_account_id', sa.BigInteger(), nullable=False),
        sa.Column('github_account_login', sa.String(length=255), nullable=False),
        sa.Column('account_type', sa.String(length=50), nullable=False, server_default='User'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('repository_selection', sa.String(length=50), nullable=False, server_default='all'),
        sa.Column('installed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_github_installations_project_id'), 'github_installations', ['project_id'])
    op.create_index(op.f('ix_github_installations_github_installation_id'), 'github_installations', ['github_installation_id'], unique=True)

    # 2. github_repositories
    op.create_table(
        'github_repositories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('installation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('github_installations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('github_repository_id', sa.BigInteger(), nullable=False),
        sa.Column('owner', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=512), nullable=False),
        sa.Column('default_branch', sa.String(length=100), nullable=False, server_default='main'),
        sa.Column('private', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('html_url', sa.String(length=1000), nullable=False),
        sa.Column('clone_url', sa.String(length=1000), nullable=False),
        sa.Column('ssh_url', sa.String(length=1000), nullable=True),
        sa.Column('visibility', sa.String(length=50), nullable=False, server_default='private'),
        sa.Column('archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_github_repositories_project_id'), 'github_repositories', ['project_id'])
    op.create_index(op.f('ix_github_repositories_installation_id'), 'github_repositories', ['installation_id'])
    op.create_index(op.f('ix_github_repositories_github_repository_id'), 'github_repositories', ['github_repository_id'], unique=True)
    op.create_index(op.f('ix_github_repositories_full_name'), 'github_repositories', ['full_name'])

    # 3. github_webhook_events
    op.create_table(
        'github_webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('github_delivery_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=True),
        sa.Column('installation_id', sa.BigInteger(), nullable=True),
        sa.Column('repository_id', sa.BigInteger(), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('signature_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processing_status', sa.String(length=50), nullable=False, server_default='RECEIVED'),
        sa.Column('payload_reference', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_github_webhook_events_github_delivery_id'), 'github_webhook_events', ['github_delivery_id'], unique=True)

    # 4. github_security_jobs
    op.create_table(
        'github_security_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
        sa.Column('repository_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('github_repositories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('webhook_event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('github_webhook_events.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('commit_sha', sa.String(length=100), nullable=True),
        sa.Column('branch', sa.String(length=255), nullable=True),
        sa.Column('pull_request_number', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='QUEUED'),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_scans.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decision_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_decisions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('check_run_id', sa.BigInteger(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_github_security_jobs_project_id'), 'github_security_jobs', ['project_id'])
    op.create_index(op.f('ix_github_security_jobs_repository_id'), 'github_security_jobs', ['repository_id'])
    op.create_index(op.f('ix_github_security_jobs_webhook_event_id'), 'github_security_jobs', ['webhook_event_id'])

    # 5. github_pull_requests
    op.create_table(
        'github_pull_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('repository_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('github_repositories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('github_pr_id', sa.BigInteger(), nullable=False),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('state', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('head_sha', sa.String(length=100), nullable=False),
        sa.Column('base_sha', sa.String(length=100), nullable=False),
        sa.Column('head_ref', sa.String(length=255), nullable=False),
        sa.Column('base_ref', sa.String(length=255), nullable=False),
        sa.Column('author_login', sa.String(length=255), nullable=True),
        sa.Column('draft', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('merged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('html_url', sa.String(length=1000), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('repository_id', 'number', name='uq_github_pr_repo_number'),
    )
    op.create_index(op.f('ix_github_pull_requests_repository_id'), 'github_pull_requests', ['repository_id'])

    # 6. github_commits
    op.create_table(
        'github_commits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('repository_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('github_repositories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sha', sa.String(length=100), nullable=False),
        sa.Column('branch', sa.String(length=255), nullable=True),
        sa.Column('author_login', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('committed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('repository_id', 'sha', name='uq_github_commit_repo_sha'),
    )
    op.create_index(op.f('ix_github_commits_repository_id'), 'github_commits', ['repository_id'])


def downgrade() -> None:
    op.drop_table('github_commits')
    op.drop_table('github_pull_requests')
    op.drop_table('github_security_jobs')
    op.drop_table('github_webhook_events')
    op.drop_table('github_repositories')
    op.drop_table('github_installations')
