"""add_scans_and_verifications

Revision ID: 20260926_0004
Revises: 20260926_0003
Create Date: 2026-09-26 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0004'
down_revision: Union[str, None] = '20260926_0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_scans
    op.create_table(
        'security_scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blueprint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_blueprints.id', ondelete='SET NULL'), nullable=True),
        sa.Column('intent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('intents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('target_type', sa.String(length=50), server_default='LOCAL_DIRECTORY', nullable=False),
        sa.Column('target_path', sa.String(length=500), nullable=False),
        sa.Column('target_reference', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='QUEUED', nullable=False),
        sa.Column('requested_by', sa.String(length=255), server_default='system', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scanner_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('finding_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_scans_project_id'), 'security_scans', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_scans_blueprint_id'), 'security_scans', ['blueprint_id'], unique=False)
    op.create_index(op.f('ix_security_scans_status'), 'security_scans', ['status'], unique=False)

    # 2. scanner_executions
    op.create_table(
        'scanner_executions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scanner_name', sa.String(length=50), nullable=False),
        sa.Column('scanner_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='QUEUED', nullable=False),
        sa.Column('scanner_version', sa.String(length=50), nullable=True),
        sa.Column('command', sa.String(length=500), nullable=True),
        sa.Column('exit_code', sa.Integer(), nullable=True),
        sa.Column('stdout_summary', sa.Text(), nullable=True),
        sa.Column('stderr_output', sa.Text(), nullable=True),
        sa.Column('finding_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_scanner_executions_scan_id'), 'scanner_executions', ['scan_id'], unique=False)
    op.create_index(op.f('ix_scanner_executions_scanner_name'), 'scanner_executions', ['scanner_name'], unique=False)
    op.create_index(op.f('ix_scanner_executions_status'), 'scanner_executions', ['status'], unique=False)

    # 3. security_findings
    op.create_table(
        'security_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scanner_execution_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('scanner_executions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scanner_name', sa.String(length=50), nullable=False),
        sa.Column('rule_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        sa.Column('column_number', sa.Integer(), nullable=True),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('fingerprint', sa.String(length=255), nullable=False),
        sa.Column('raw_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_findings_scan_id'), 'security_findings', ['scan_id'], unique=False)
    op.create_index(op.f('ix_security_findings_scanner_execution_id'), 'security_findings', ['scanner_execution_id'], unique=False)
    op.create_index(op.f('ix_security_findings_rule_id'), 'security_findings', ['rule_id'], unique=False)
    op.create_index(op.f('ix_security_findings_severity'), 'security_findings', ['severity'], unique=False)
    op.create_index(op.f('ix_security_findings_fingerprint'), 'security_findings', ['fingerprint'], unique=False)

    # 4. requirement_verification_results
    op.create_table(
        'requirement_verification_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_scans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_requirements.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requirement_key', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('evidence_summary', sa.Text(), nullable=False),
        sa.Column('contributing_findings_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_requirement_verification_results_scan_id'), 'requirement_verification_results', ['scan_id'], unique=False)
    op.create_index(op.f('ix_requirement_verification_results_requirement_id'), 'requirement_verification_results', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_requirement_verification_results_requirement_key'), 'requirement_verification_results', ['requirement_key'], unique=False)
    op.create_index(op.f('ix_requirement_verification_results_status'), 'requirement_verification_results', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_requirement_verification_results_status'), table_name='requirement_verification_results')
    op.drop_index(op.f('ix_requirement_verification_results_requirement_key'), table_name='requirement_verification_results')
    op.drop_index(op.f('ix_requirement_verification_results_requirement_id'), table_name='requirement_verification_results')
    op.drop_index(op.f('ix_requirement_verification_results_scan_id'), table_name='requirement_verification_results')
    op.drop_table('requirement_verification_results')

    op.drop_index(op.f('ix_security_findings_fingerprint'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_severity'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_rule_id'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_scanner_execution_id'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_scan_id'), table_name='security_findings')
    op.drop_table('security_findings')

    op.drop_index(op.f('ix_scanner_executions_status'), table_name='scanner_executions')
    op.drop_index(op.f('ix_scanner_executions_scanner_name'), table_name='scanner_executions')
    op.drop_index(op.f('ix_scanner_executions_scan_id'), table_name='scanner_executions')
    op.drop_table('scanner_executions')

    op.drop_index(op.f('ix_security_scans_status'), table_name='security_scans')
    op.drop_index(op.f('ix_security_scans_blueprint_id'), table_name='security_scans')
    op.drop_index(op.f('ix_security_scans_project_id'), table_name='security_scans')
    op.drop_table('security_scans')
