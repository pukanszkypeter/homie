"""Add an optional note to a month's entry

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"


def upgrade() -> None:
    op.add_column("cost_entries", sa.Column("note", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("cost_entries", "note")
