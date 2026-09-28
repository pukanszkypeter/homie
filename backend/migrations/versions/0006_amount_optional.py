"""Make an entry's amount optional

A metered item's quantity (e.g. kWh used) can now be logged before its price is known -
amount_huf and quantity are never both null, that's enforced in set_entry, not here.

This drops a NOT NULL constraint, which Postgres does with a direct ALTER COLUMN - no
table rebuild, unlike adding one (see 0005 and app/costs/db.py's migrate() docstring).

Revision ID: 0006
Revises: 0005
"""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"


def upgrade() -> None:
    with op.batch_alter_table("cost_entries") as batch_op:
        batch_op.alter_column("amount_huf", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("cost_entries") as batch_op:
        batch_op.alter_column("amount_huf", existing_type=sa.Integer(), nullable=False)
