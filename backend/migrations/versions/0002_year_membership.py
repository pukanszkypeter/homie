"""List sections and items per year

Until now every section and item showed up in every year. This adds the tables that say
which years each one belongs to, and places what already exists in the years where it has
data (or in the current year when it has none).

Revision ID: 0002
Revises: 0001
"""

import datetime as dt

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    op.create_table(
        "cost_section_years",
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("cost_sections.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("year", sa.Integer(), primary_key=True),
    )
    op.create_table(
        "cost_item_years",
        sa.Column(
            "item_id",
            sa.Integer(),
            sa.ForeignKey("cost_items.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("year", sa.Integer(), primary_key=True),
    )

    connection = op.get_bind()
    # strftime is SQLite-only; Postgres needs EXTRACT instead.
    year_of_month = (
        "CAST(strftime('%Y', month) AS INTEGER)"
        if connection.dialect.name == "sqlite"
        else "CAST(EXTRACT(YEAR FROM month) AS INTEGER)"
    )
    this_year = {"year": dt.date.today().year}
    connection.execute(
        sa.text(
            "INSERT INTO cost_item_years (item_id, year) "
            f"SELECT DISTINCT item_id, {year_of_month} FROM cost_entries"
        )
    )
    connection.execute(
        sa.text(
            "INSERT INTO cost_item_years (item_id, year) SELECT id, :year FROM cost_items "
            "WHERE id NOT IN (SELECT item_id FROM cost_item_years)"
        ),
        this_year,
    )
    connection.execute(
        sa.text(
            "INSERT INTO cost_section_years (section_id, year) "
            "SELECT DISTINCT items.section_id, item_years.year FROM cost_item_years AS item_years "
            "JOIN cost_items AS items ON items.id = item_years.item_id"
        )
    )
    connection.execute(
        sa.text(
            "INSERT INTO cost_section_years (section_id, year) SELECT id, :year FROM cost_sections "
            "WHERE id NOT IN (SELECT section_id FROM cost_section_years)"
        ),
        this_year,
    )


def downgrade() -> None:
    op.drop_table("cost_item_years")
    op.drop_table("cost_section_years")
