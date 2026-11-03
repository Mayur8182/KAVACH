"""add_step14_runtime_security_agent

Revision ID: 20260927_0012
Revises: 20260927_0011
Create Date: 2026-09-27 04:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260927_0012'
down_revision: Union[str, None] = '20260927_0011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_response_plans
    op.create_table(
        'security_response_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('active_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_response_plans_project_id', 'security_response_plans', ['project_id'])

    # 2. security_response_plan_versions
    op.create_table(
        'security_response_plan_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_response_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('definition', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_response_plan_versions_plan_id', 'security_response_plan_versions', ['plan_id'])

    # 3. security_response_decisions
    op.create_table(
        'security_response_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_verifications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('violation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_violations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('policy_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_policy_versions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_response_decisions_project_id', 'security_response_decisions', ['project_id'])
    op.create_index('ix_security_response_decisions_violation_id', 'security_response_decisions', ['violation_id'])

    # 4. security_response_actions
    op.create_table(
        'security_response_actions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('violation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_violations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_verifications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('contract_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_versions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action_type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='REQUESTED'),
        sa.Column('mode', sa.String(length=50), nullable=False, server_default='OBSERVE'),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('target_type', sa.String(length=100), nullable=False),
        sa.Column('target_id', sa.String(length=255), nullable=False),
        sa.Column('requested_by_type', sa.String(length=50), nullable=False, server_default='USER'),
        sa.Column('requested_by_id', sa.String(length=255), nullable=False),
        sa.Column('policy_decision_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_response_decisions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('approval_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_approvals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('authorization_context', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('request', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('idempotency_key', sa.String(length=255), nullable=True, unique=True),
    )
    op.create_index('ix_security_response_actions_project_id', 'security_response_actions', ['project_id'])
    op.create_index('ix_security_response_actions_status', 'security_response_actions', ['status'])
    op.create_index('ix_security_response_actions_target_id', 'security_response_actions', ['target_id'])

    # 5. response_execution_attempts
    op.create_table(
        'response_execution_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('response_action_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_response_actions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('executor_type', sa.String(length=100), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='STARTED'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('request', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('target_state_before', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('target_state_after', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_response_execution_attempts_action_id', 'response_execution_attempts', ['response_action_id'])

    # 6. runtime_enforcement_rules
    op.create_table(
        'runtime_enforcement_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_type', sa.String(length=100), nullable=False),
        sa.Column('target_type', sa.String(length=100), nullable=False),
        sa.Column('target_id', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False, server_default='BLOCK'),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('source_violation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_violations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_runtime_enforcement_rules_project_id', 'runtime_enforcement_rules', ['project_id'])
    op.create_index('ix_runtime_enforcement_rules_target_id', 'runtime_enforcement_rules', ['target_id'])
    op.create_index('ix_runtime_enforcement_rules_expires_at', 'runtime_enforcement_rules', ['expires_at'])

    # 7. security_incidents
    op.create_table(
        'security_incidents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('first_detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('primary_violation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_contract_violations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_incidents_project_id', 'security_incidents', ['project_id'])
    op.create_index('ix_security_incidents_status', 'security_incidents', ['status'])

    # 8. security_incident_events
    op.create_table(
        'security_incident_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_incidents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_incident_events_incident_id', 'security_incident_events', ['incident_id'])
    op.create_index('ix_security_incident_events_event_id', 'security_incident_events', ['event_id'])


def downgrade() -> None:
    op.drop_table('security_incident_events')
    op.drop_table('security_incidents')
    op.drop_table('runtime_enforcement_rules')
    op.drop_table('response_execution_attempts')
    op.drop_table('security_response_actions')
    op.drop_table('security_response_decisions')
    op.drop_table('security_response_plan_versions')
    op.drop_table('security_response_plans')
