"""Create the cost tables

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade() -> None:
    op.create_table(
        "cost_sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_table(
        "cost_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("cost_sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("unit", sa.String(20)),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("section_id", "name"),
    )
    op.create_table(
        "cost_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "item_id",
            sa.Integer(),
            sa.ForeignKey("cost_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("amount_huf", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Float()),
        sa.UniqueConstraint("item_id", "month"),
    )


def downgrade() -> None:
    op.drop_table("cost_entries")
    op.drop_table("cost_items")
    op.drop_table("cost_sections")
