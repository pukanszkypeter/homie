"""Give every section a chart color

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"

# The palette as it was when this migration was written (see app/costs/colors.py).
COLORS = ["yellow", "blue", "coral", "purple", "green", "orange", "cyan", "lime", "pink"]


def upgrade() -> None:
    op.add_column(
        "cost_sections",
        sa.Column("color", sa.String(20), nullable=False, server_default=COLORS[0]),
    )
    connection = op.get_bind()
    ids = connection.execute(sa.text("SELECT id FROM cost_sections ORDER BY position, id"))
    for index, (section_id,) in enumerate(ids.all()):
        connection.execute(
            sa.text("UPDATE cost_sections SET color = :color WHERE id = :id"),
            {"color": COLORS[index % len(COLORS)], "id": section_id},
        )


def downgrade() -> None:
    op.drop_column("cost_sections", "color")
