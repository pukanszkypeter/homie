"""Queries and calculations for the costs data. Totals are always computed, never stored."""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models
from .colors import COST_COLORS
from .models import COUNT_UNIT
from .tables import CostEntry, CostItem, CostItemYear, CostSection, CostSectionYear

TREND_MONTHS = 12


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


def parse_month(value: str) -> dt.date:
    try:
        year, month = value.split("-")
        return dt.date(int(year), int(month), 1)
    except ValueError:
        raise ValueError(f"Not a month (expected YYYY-MM): {value}") from None


def _month_key(day: dt.date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def _unit_price(amount: int | None, quantity: float | None) -> float | None:
    return round(amount / quantity, 2) if amount is not None and quantity else None


def _clean_note(note: str | None) -> str | None:
    return (note or "").strip() or None


def _year_months(year: int):
    """SQL conditions selecting the entries that fall in `year`."""
    return CostEntry.month >= dt.date(year, 1, 1), CostEntry.month <= dt.date(year, 12, 1)


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise ConflictError("That name already exists here") from None


# --- structure ---------------------------------------------------------------------------------
# Sections and items are shared across years (so an item's history is continuous), but each
# year lists only the ones that belong to it, so subscriptions can come and go.


def _sections_of_year(session: Session, year: int) -> list[CostSection]:
    return list(
        session.scalars(
            select(CostSection)
            .join(CostSectionYear, CostSectionYear.section_id == CostSection.id)
            .where(CostSectionYear.year == year)
            .order_by(CostSection.position, CostSection.id)
        )
    )


def _items_of_year(session: Session, section_id: int, year: int) -> list[CostItem]:
    return list(
        session.scalars(
            select(CostItem)
            .join(CostItemYear, CostItemYear.item_id == CostItem.id)
            .where(CostItem.section_id == section_id, CostItemYear.year == year)
            .order_by(CostItem.position, CostItem.id)
        )
    )


def _next_position(session: Session, column, *criteria) -> int:
    return (session.scalar(select(func.max(column)).where(*criteria)) or 0) + 1


def _section_in_year(session: Session, section_id: int, year: int) -> CostSection:
    section = session.get(CostSection, section_id)
    if section is None or session.get(CostSectionYear, (section_id, year)) is None:
        raise NotFoundError(f"That section isn't in {year}")
    return section


def _item_in_year(session: Session, item_id: int, year: int) -> CostItem:
    item = session.get(CostItem, item_id)
    if item is None or session.get(CostItemYear, (item_id, year)) is None:
        raise NotFoundError(f"That item isn't in {year}")
    return item


def _next_color(session: Session) -> str:
    """The palette color used by the fewest sections (the first one on ties)."""
    used = list(session.scalars(select(CostSection.color)))
    return min(COST_COLORS, key=lambda color: (used.count(color), COST_COLORS.index(color)))


def update_section(session: Session, section_id: int, data: models.SectionUpdate) -> models.Section:
    """Rename or recolor a section. Applies to every year it is listed in."""
    section = session.get(CostSection, section_id)
    if section is None:
        raise NotFoundError("Unknown section")
    if data.name:
        section.name = data.name
    if data.color:
        section.color = data.color
    _commit(session)
    return models.Section(id=section.id, name=section.name, color=section.color, items=[])


def add_section(session: Session, year: int, data: models.SectionIn) -> models.Section:
    section = session.scalar(select(CostSection).where(CostSection.name == data.name))
    if section is None:
        section = CostSection(
            name=data.name,
            position=_next_position(session, CostSection.position),
            color=data.color or _next_color(session),
        )
        session.add(section)
        session.flush()
    elif session.get(CostSectionYear, (section.id, year)) is not None:
        raise ConflictError(f"{year} already has a section with that name")
    session.add(CostSectionYear(section_id=section.id, year=year))
    _commit(session)
    return models.Section(id=section.id, name=section.name, color=section.color, items=[])


def delete_section(session: Session, year: int, section_id: int) -> None:
    """Remove a section, its items and their months from one year. Other years are untouched."""
    _remove_section(session, year, section_id)
    session.commit()


def delete_year(session: Session, year: int) -> None:
    """Remove everything listed in a year, with its months. Other years are untouched."""
    sections = _sections_of_year(session, year)
    if not sections:
        raise NotFoundError(f"{year} has nothing to delete")
    for section in sections:
        _remove_section(session, year, section.id)
    session.execute(delete(CostEntry).where(*_year_months(year)))  # nothing should be left
    session.commit()


def _remove_section(session: Session, year: int, section_id: int) -> None:
    section = _section_in_year(session, section_id, year)
    item_ids = [item.id for item in _items_of_year(session, section_id, year)]
    if item_ids:
        session.execute(
            delete(CostEntry).where(CostEntry.item_id.in_(item_ids), *_year_months(year))
        )
        session.execute(
            delete(CostItemYear).where(
                CostItemYear.item_id.in_(item_ids), CostItemYear.year == year
            )
        )
    session.delete(session.get(CostSectionYear, (section_id, year)))
    session.flush()
    _drop_unused(session, section)


def _drop_unused(session: Session, section: CostSection) -> None:
    """Forget items and sections that no year lists any more, so their names can be reused."""
    for item in list(section.items):
        if not session.scalar(select(CostItemYear).where(CostItemYear.item_id == item.id).limit(1)):
            session.delete(item)
    session.flush()
    session.refresh(section)
    if not session.scalar(
        select(CostSectionYear).where(CostSectionYear.section_id == section.id).limit(1)
    ):
        session.delete(section)


def _swap_with_neighbor(session: Session, siblings: list, target_id: int, direction: str) -> None:
    """Move one entry a step within `siblings` (already in display order) by swapping its
    position with the neighbor's. At either end nothing happens."""
    index = next(i for i, sibling in enumerate(siblings) if sibling.id == target_id)
    other = index - 1 if direction == "up" else index + 1
    if not 0 <= other < len(siblings):
        return
    moved, neighbor = siblings[index], siblings[other]
    if moved.position == neighbor.position:  # never expected, but keep it from getting stuck
        moved.position += -1 if direction == "up" else 1
    else:
        moved.position, neighbor.position = neighbor.position, moved.position
    session.commit()


def move_section(session: Session, year: int, section_id: int, data: models.MoveIn) -> None:
    """Order is shared by all years, so a section keeps its place relative to the others."""
    _section_in_year(session, section_id, year)
    _swap_with_neighbor(session, _sections_of_year(session, year), section_id, data.direction)


def move_item(session: Session, year: int, item_id: int, data: models.MoveIn) -> None:
    item = _item_in_year(session, item_id, year)
    siblings = _items_of_year(session, item.section_id, year)
    _swap_with_neighbor(session, siblings, item_id, data.direction)


def _clean_unit(unit: str | None) -> str:
    return (unit or "").strip() or COUNT_UNIT


def add_item(session: Session, year: int, data: models.ItemIn) -> models.Item:
    section = _section_in_year(session, data.section_id, year)
    # None here means "didn't specify one" (reuse the existing item's unit as-is), distinct
    # from an empty result of cleaning, which would mean "explicitly wants a plain count".
    specified_unit = (data.unit or "").strip() or None
    item = session.scalar(
        select(CostItem).where(CostItem.section_id == section.id, CostItem.name == data.name)
    )
    if item is None:
        item = CostItem(
            section_id=section.id,
            name=data.name,
            unit=specified_unit or COUNT_UNIT,
            position=_next_position(session, CostItem.position, CostItem.section_id == section.id),
        )
        session.add(item)
        session.flush()
    elif session.get(CostItemYear, (item.id, year)) is not None:
        raise ConflictError(f"{year} already has an item with that name here")
    elif specified_unit is not None and specified_unit != item.unit:
        # The same item in another year: its unit must stay the same for the history to add up.
        raise ConflictError(f"'{item.name}' already exists with unit {item.unit}")
    session.add(CostItemYear(item_id=item.id, year=year))
    _commit(session)
    return models.Item(id=item.id, name=item.name, unit=item.unit)


def copy_structure(session: Session, year: int, data: models.StructureCopy) -> None:
    """Copy the sections and items (not the amounts) of another year into this one."""
    if data.copy_from == year:
        raise ConflictError("Pick a different year to copy from")
    sections = _sections_of_year(session, data.copy_from)
    if not sections:
        raise NotFoundError(f"{data.copy_from} has no sections to copy")
    for section in sections:
        if session.get(CostSectionYear, (section.id, year)) is None:
            session.add(CostSectionYear(section_id=section.id, year=year))
        for item in _items_of_year(session, section.id, data.copy_from):
            if session.get(CostItemYear, (item.id, year)) is None:
                session.add(CostItemYear(item_id=item.id, year=year))
    session.commit()


def update_item(session: Session, item_id: int, data: models.ItemUpdate) -> models.Item:
    """Rename or change the unit. Applies to every year the item is listed in."""
    item = _require_item(session, item_id)
    fields = data.model_fields_set
    if "name" in fields and data.name:
        item.name = data.name
    if "unit" in fields:
        item.unit = _clean_unit(data.unit)
    _commit(session)
    return models.Item(id=item.id, name=item.name, unit=item.unit)


def delete_item(session: Session, year: int, item_id: int) -> None:
    """Remove an item and its months from one year. Other years keep it."""
    item = _item_in_year(session, item_id, year)
    session.execute(delete(CostEntry).where(CostEntry.item_id == item_id, *_year_months(year)))
    session.delete(session.get(CostItemYear, (item_id, year)))
    session.flush()
    if not session.scalar(select(CostItemYear).where(CostItemYear.item_id == item_id).limit(1)):
        session.delete(item)
    session.commit()


def _require_item(session: Session, item_id: int) -> CostItem:
    item = session.get(CostItem, item_id)
    if item is None:
        raise NotFoundError("Unknown item")
    return item


# --- entries -----------------------------------------------------------------------------------


def set_entry(session: Session, item_id: int, month: dt.date, data: models.EntryIn) -> models.Cell:
    item = _item_in_year(session, item_id, month.year)
    # A plain-count item's quantity is always 1, enforced here regardless of what was sent
    # (the frontend disables that field, but the backend doesn't rely on that alone). Its
    # "quantity" isn't something you separately measure, so unlike a metered item it can't
    # stand in for a price left blank - a count item still needs one.
    if item.unit == COUNT_UNIT and data.amount_huf is None:
        raise ConflictError(f"'{item.name}' needs a cost, not just a quantity")
    quantity = 1.0 if item.unit == COUNT_UNIT else data.quantity
    entry = session.scalar(
        select(CostEntry).where(CostEntry.item_id == item_id, CostEntry.month == month)
    )
    if entry is None:
        entry = CostEntry(item_id=item_id, month=month)
        session.add(entry)
    entry.amount_huf = data.amount_huf
    entry.quantity = quantity
    entry.note = _clean_note(data.note)
    session.commit()
    return models.Cell(
        amount_huf=entry.amount_huf,
        quantity=entry.quantity,
        unit_price=_unit_price(entry.amount_huf, entry.quantity),
        note=entry.note,
    )


def delete_entry(session: Session, item_id: int, month: dt.date) -> None:
    entry = session.scalar(
        select(CostEntry).where(CostEntry.item_id == item_id, CostEntry.month == month)
    )
    if entry is None:
        raise NotFoundError("No entry for that month")
    session.delete(entry)
    session.commit()


# --- reports -----------------------------------------------------------------------------------


def _sum(values: list[int | None]) -> int | None:
    present = [v for v in values if v is not None]
    return sum(present) if present else None


def year_report(session: Session, year: int) -> models.YearResponse:
    cells: dict[tuple[int, int], models.Cell] = {}
    for entry in session.scalars(select(CostEntry).where(*_year_months(year))):
        cells[(entry.item_id, entry.month.month - 1)] = models.Cell(
            amount_huf=entry.amount_huf,
            quantity=entry.quantity,
            unit_price=_unit_price(entry.amount_huf, entry.quantity),
            note=entry.note,
        )

    sections: list[models.SectionYear] = []
    for section in _sections_of_year(session, year):
        items: list[models.ItemYear] = []
        for item in _items_of_year(session, section.id, year):
            months = [cells.get((item.id, m)) for m in range(12)]
            amounts = [c.amount_huf if c else None for c in months]
            items.append(
                models.ItemYear(
                    id=item.id,
                    name=item.name,
                    unit=item.unit,
                    months=months,
                    total_huf=_sum(amounts) or 0,
                )
            )
        month_totals = [
            _sum([i.months[m].amount_huf if i.months[m] else None for i in items])
            for m in range(12)
        ]
        sections.append(
            models.SectionYear(
                id=section.id,
                name=section.name,
                color=section.color,
                items=items,
                month_totals=month_totals,
                total_huf=_sum(month_totals) or 0,
            )
        )

    month_totals = [_sum([s.month_totals[m] for s in sections]) for m in range(12)]
    return models.YearResponse(
        year=year,
        years=_known_years(session),
        sections=sections,
        month_totals=month_totals,
        total_huf=_sum(month_totals) or 0,
    )


def _known_years(session: Session) -> list[int]:
    listed = session.scalars(select(CostSectionYear.year).distinct())
    return sorted(set(listed), reverse=True)


def item_series(session: Session, item_id: int) -> models.ItemSeries:
    """The item's history across every year it has been listed in."""
    item = _require_item(session, item_id)
    entries = session.scalars(
        select(CostEntry).where(CostEntry.item_id == item_id).order_by(CostEntry.month)
    )
    return models.ItemSeries(
        id=item.id,
        name=item.name,
        unit=item.unit,
        points=[
            models.SeriesPoint(
                month=_month_key(e.month),
                amount_huf=e.amount_huf,
                quantity=e.quantity,
                unit_price=_unit_price(e.amount_huf, e.quantity),
                note=e.note,
            )
            for e in entries
        ],
    )


def summary(session: Session) -> models.SummaryResponse:
    # SUM ignores NULL amounts on its own, but a month/section whose entries are ALL
    # quantity-only (no price yet) sums to NULL overall, not 0 - skip those, same as a
    # month with no entries at all: no price data means no data.
    rows = session.execute(
        select(CostEntry.month, func.sum(CostEntry.amount_huf))
        .group_by(CostEntry.month)
        .order_by(CostEntry.month)
    ).all()
    totals = [
        models.MonthTotal(month=_month_key(m), total_huf=int(t)) for m, t in rows if t is not None
    ]
    if not totals:
        return models.SummaryResponse(latest=None, previous=None, by_section=[], trend=[])

    latest_month = parse_month(totals[-1].month)
    by_section: dict[str, int] = defaultdict(int)
    for name, total in session.execute(
        select(CostSection.name, func.sum(CostEntry.amount_huf))
        .join(CostItem, CostItem.section_id == CostSection.id)
        .join(CostEntry, CostEntry.item_id == CostItem.id)
        .where(CostEntry.month == latest_month)
        .group_by(CostSection.id)
        .order_by(CostSection.position)
    ):
        if total is not None:
            by_section[name] = int(total)

    return models.SummaryResponse(
        latest=totals[-1],
        previous=totals[-2] if len(totals) > 1 else None,
        by_section=[models.SectionShare(name=n, total_huf=t) for n, t in by_section.items()],
        trend=totals[-TREND_MONTHS:],
    )
