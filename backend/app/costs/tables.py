from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class CostSection(Base):
    """A group of cost items, e.g. utilities or subscriptions. Which years it appears in is
    decided by CostSectionYear, so a section can come and go between years."""

    __tablename__ = "cost_sections"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(20), default="yellow")

    items: Mapped[list[CostItem]] = relationship(
        back_populates="section", cascade="all, delete-orphan", order_by="CostItem.position"
    )


class CostItem(Base):
    """One cost, e.g. water. `unit` is a real unit for metered costs (m3, kWh), or "1" for a
    plain count (e.g. a subscription) - always set, never blank. The same item keeps its
    identity across years (so its history is continuous); CostItemYear says in which years
    it is listed."""

    __tablename__ = "cost_items"
    __table_args__ = (UniqueConstraint("section_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("cost_sections.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    unit: Mapped[str] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer, default=0)

    section: Mapped[CostSection] = relationship(back_populates="items")
    entries: Mapped[list[CostEntry]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class CostEntry(Base):
    """What an item cost in one month. No row means no data, which is not the same as 0.
    amount_huf can itself be missing on a row that exists: a metered item's quantity can be
    logged before the bill (and its price) is known. amount_huf and quantity are never both
    None - set_entry rejects that, there'd be nothing to record."""

    __tablename__ = "cost_entries"
    __table_args__ = (UniqueConstraint("item_id", "month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("cost_items.id", ondelete="CASCADE"))
    month: Mapped[dt.date] = mapped_column(Date)  # always the first day of the month
    # Whole forints; negative for credits; None means the quantity below is logged but the
    # price isn't known yet.
    amount_huf: Mapped[int | None] = mapped_column(Integer, default=None)
    quantity: Mapped[float | None] = mapped_column(Float, default=None)  # in the item's unit
    note: Mapped[str | None] = mapped_column(String(500), default=None)

    item: Mapped[CostItem] = relationship(back_populates="entries")


class CostSectionYear(Base):
    """A section is listed in this year."""

    __tablename__ = "cost_section_years"

    section_id: Mapped[int] = mapped_column(
        ForeignKey("cost_sections.id", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(Integer, primary_key=True)


class CostItemYear(Base):
    """An item is listed in this year."""

    __tablename__ = "cost_item_years"

    item_id: Mapped[int] = mapped_column(
        ForeignKey("cost_items.id", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
