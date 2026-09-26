"""add_blueprints_tables

Revision ID: 20260926_0003
Revises: 20260926_0002
Create Date: 2026-09-26 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0003'
down_revision: Union[str, None] = '20260926_0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. security_blueprints
    op.create_table(
        'security_blueprints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('intent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('intents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='GENERATED', nullable=False),
        sa.Column('methodology_version', sa.String(length=50), server_default='2026.1.0', nullable=False),
        sa.Column('generated_by', sa.String(length=255), server_default='system', nullable=False),
        sa.Column('risk_factors', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_blueprints_project_id'), 'security_blueprints', ['project_id'], unique=False)
    op.create_index(op.f('ix_security_blueprints_intent_id'), 'security_blueprints', ['intent_id'], unique=False)
    op.create_index(op.f('ix_security_blueprints_status'), 'security_blueprints', ['status'], unique=False)

    # 2. security_requirements
    op.create_table(
        'security_requirements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('blueprint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_blueprints.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requirement_key', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('mandatory', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('verification_strategy', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('security_invariant', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_requirements_blueprint_id'), 'security_requirements', ['blueprint_id'], unique=False)
    op.create_index(op.f('ix_security_requirements_requirement_key'), 'security_requirements', ['requirement_key'], unique=False)
    op.create_index(op.f('ix_security_requirements_category'), 'security_requirements', ['category'], unique=False)

    # 3. security_requirement_evidence
    op.create_table(
        'security_requirement_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_requirements.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_field', sa.String(length=100), nullable=False),
        sa.Column('evidence_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_security_requirement_evidence_requirement_id'), 'security_requirement_evidence', ['requirement_id'], unique=False)

    # 4. security_requirement_dependencies
    op.create_table(
        'security_requirement_dependencies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('security_requirements.id', ondelete='CASCADE'), nullable=False),
        sa.Column('depends_on_key', sa.String(length=100), nullable=False),
        sa.Column('dependency_type', sa.String(length=50), server_default='PREREQUISITE', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
    )
    op.create_index(op.f('ix_security_requirement_dependencies_requirement_id'), 'security_requirement_dependencies', ['requirement_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_security_requirement_dependencies_requirement_id'), table_name='security_requirement_dependencies')
    op.drop_table('security_requirement_dependencies')

    op.drop_index(op.f('ix_security_requirement_evidence_requirement_id'), table_name='security_requirement_evidence')
    op.drop_table('security_requirement_evidence')

    op.drop_index(op.f('ix_security_requirements_category'), table_name='security_requirements')
    op.drop_index(op.f('ix_security_requirements_requirement_key'), table_name='security_requirements')
    op.drop_index(op.f('ix_security_requirements_blueprint_id'), table_name='security_requirements')
    op.drop_table('security_requirements')

    op.drop_index(op.f('ix_security_blueprints_status'), table_name='security_blueprints')
    op.drop_index(op.f('ix_security_blueprints_intent_id'), table_name='security_blueprints')
    op.drop_index(op.f('ix_security_blueprints_project_id'), table_name='security_blueprints')
    op.drop_table('security_blueprints')
