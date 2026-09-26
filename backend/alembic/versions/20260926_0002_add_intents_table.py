"""add_intents_table

Revision ID: 20260926_0002
Revises: 20260926_0001
Create Date: 2026-09-26 19:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260926_0002'
down_revision: Union[str, None] = '20260926_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'intents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('raw_input', sa.Text(), nullable=False),
        sa.Column('environment', sa.String(length=50), server_default='development', nullable=False),
        sa.Column('application_type', sa.String(length=100), server_default='UNKNOWN', nullable=False),
        sa.Column('purpose', sa.Text(), server_default='', nullable=False),
        sa.Column('normalized_intent', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ANALYZED', nullable=False),
        sa.Column('provider', sa.String(length=100), server_default='deterministic', nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('overall_confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_intents_project_id'), 'intents', ['project_id'], unique=False)
    op.create_index(op.f('ix_intents_application_type'), 'intents', ['application_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_intents_application_type'), table_name='intents')
    op.drop_index(op.f('ix_intents_project_id'), table_name='intents')
    op.drop_table('intents')
