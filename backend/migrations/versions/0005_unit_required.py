"""Make an item's unit required

Items without a real unit (subscriptions, flat fees) get "1" instead of nothing, and their
existing entries get quantity=1 to match (so the item's yearly total in Unit view reads as
a plain count of the months entered, e.g. 12 for a full year). A "1" unit is a signal, not
a measurement: the frontend locks its quantity input to 1 and the backend enforces the same
in `set_entry`.

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"

COUNT_UNIT = "1"


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            "UPDATE cost_items SET unit = :unit WHERE unit IS NULL OR trim(unit) = ''"
        ).bindparams(unit=COUNT_UNIT)
    )
    connection.execute(
        sa.text(
            "UPDATE cost_entries SET quantity = 1 "
            "WHERE item_id IN (SELECT id FROM cost_items WHERE unit = :unit)"
        ).bindparams(unit=COUNT_UNIT)
    )
    with op.batch_alter_table("cost_items") as batch_op:
        batch_op.alter_column("unit", existing_type=sa.String(20), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("cost_items") as batch_op:
        batch_op.alter_column("unit", existing_type=sa.String(20), nullable=True)
