from __future__ import annotations

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .colors import CostColor

Month = str  # "YYYY-MM"

# An item whose unit is this sentinel has no real measured quantity (e.g. a subscription):
# its monthly quantity is always exactly 1, fixed by the backend, not editable.
COUNT_UNIT = "1"


class _Named(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)


class SectionIn(_Named):
    color: CostColor | None = None  # None = the next unused color


class SectionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: CostColor | None = None


class ItemIn(_Named):
    section_id: int
    # For metered costs, e.g. "kWh" or "m3". Blank becomes "1": a plain count (one
    # occurrence per month, e.g. a subscription) rather than a real measured quantity.
    unit: str | None = Field(default=None, max_length=20)


class MoveIn(BaseModel):
    """Swap with the neighbor above (up) or below (down) among what the year lists."""

    direction: Literal["up", "down"]


class StructureCopy(BaseModel):
    """Copy the sections and items (not the amounts) of another year into this one."""

    copy_from: int = Field(ge=2000, le=2100)


class ItemUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    # Blank becomes "1", same as ItemIn.unit.
    unit: str | None = Field(default=None, max_length=20)


class EntryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # None means "not known yet" - a metered item's quantity can be logged before its
    # price is. Both being None is rejected below: there'd be nothing to save.
    amount_huf: int | None = Field(default=None, ge=-1_000_000_000, le=1_000_000_000)
    quantity: float | None = Field(default=None, gt=0, le=1_000_000_000)
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _something_to_save(self) -> Self:
        if self.amount_huf is None and self.quantity is None:
            raise ValueError("Give a cost, a quantity, or both")
        return self


class Item(BaseModel):
    id: int
    name: str
    unit: str  # always set; "1" means a plain count rather than a real unit


class Section(BaseModel):
    id: int
    name: str
    color: CostColor
    items: list[Item]


class Cell(BaseModel):
    amount_huf: int | None  # None means a quantity was logged but the price isn't known yet
    quantity: float | None
    unit_price: float | None  # amount per unit, only when both are known
    note: str | None


class ItemYear(Item):
    months: list[Cell | None]  # January..December, None = no data
    total_huf: int


class SectionYear(BaseModel):
    id: int
    name: str
    color: CostColor
    items: list[ItemYear]
    month_totals: list[int | None]
    total_huf: int


class YearResponse(BaseModel):
    year: int
    years: list[int]  # every year that has data, newest first
    sections: list[SectionYear]
    month_totals: list[int | None]
    total_huf: int


class SeriesPoint(BaseModel):
    month: Month
    amount_huf: int | None
    quantity: float | None
    unit_price: float | None
    note: str | None


class ItemSeries(Item):
    points: list[SeriesPoint]


class MonthTotal(BaseModel):
    month: Month
    total_huf: int


class SectionShare(BaseModel):
    name: str
    total_huf: int


class SummaryResponse(BaseModel):
    """What the Home widget needs; `latest` is None until any cost has been entered."""

    latest: MonthTotal | None
    previous: MonthTotal | None
    by_section: list[SectionShare]  # latest month
    trend: list[MonthTotal]  # up to the last 12 months with data, oldest first
