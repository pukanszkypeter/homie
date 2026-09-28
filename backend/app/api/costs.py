from __future__ import annotations

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from sqlalchemy.orm import Session

from ..costs import models, service
from ..costs.db import get_session

router = APIRouter(prefix="/api/costs", tags=["costs"])

Db = Annotated[Session, Depends(get_session)]
MonthPath = Annotated[str, Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-09"])]


def _run[T](action: Callable[[], T]) -> T:
    try:
        return action()
    except service.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    except service.ConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None


YearPath = Annotated[int, Path(ge=2000, le=2100)]


@router.post("/years/{year}/sections", response_model=models.Section, status_code=201)
def add_section(year: YearPath, body: models.SectionIn, db: Db) -> Any:
    return _run(lambda: service.add_section(db, year, body))


@router.delete("/years/{year}/sections/{section_id}", status_code=204)
def delete_section(year: YearPath, section_id: int, db: Db) -> Response:
    _run(lambda: service.delete_section(db, year, section_id))
    return Response(status_code=204)


@router.patch("/sections/{section_id}", response_model=models.Section)
def update_section(section_id: int, body: models.SectionUpdate, db: Db) -> Any:
    return _run(lambda: service.update_section(db, section_id, body))


@router.delete("/years/{year}", status_code=204)
def delete_year(year: YearPath, db: Db) -> Response:
    _run(lambda: service.delete_year(db, year))
    return Response(status_code=204)


@router.post("/years/{year}/sections/{section_id}/move", status_code=204)
def move_section(year: YearPath, section_id: int, body: models.MoveIn, db: Db) -> Response:
    _run(lambda: service.move_section(db, year, section_id, body))
    return Response(status_code=204)


@router.post("/years/{year}/items/{item_id}/move", status_code=204)
def move_item(year: YearPath, item_id: int, body: models.MoveIn, db: Db) -> Response:
    _run(lambda: service.move_item(db, year, item_id, body))
    return Response(status_code=204)


@router.post("/years/{year}/items", response_model=models.Item, status_code=201)
def add_item(year: YearPath, body: models.ItemIn, db: Db) -> Any:
    return _run(lambda: service.add_item(db, year, body))


@router.delete("/years/{year}/items/{item_id}", status_code=204)
def delete_item(year: YearPath, item_id: int, db: Db) -> Response:
    _run(lambda: service.delete_item(db, year, item_id))
    return Response(status_code=204)


@router.post("/years/{year}/structure", status_code=204)
def copy_structure(year: YearPath, body: models.StructureCopy, db: Db) -> Response:
    _run(lambda: service.copy_structure(db, year, body))
    return Response(status_code=204)


@router.patch("/items/{item_id}", response_model=models.Item)
def update_item(item_id: int, body: models.ItemUpdate, db: Db) -> Any:
    return _run(lambda: service.update_item(db, item_id, body))


@router.get("/items/{item_id}/series", response_model=models.ItemSeries)
def item_series(item_id: int, db: Db) -> Any:
    return _run(lambda: service.item_series(db, item_id))


@router.put("/items/{item_id}/entries/{month}", response_model=models.Cell)
def set_entry(item_id: int, month: MonthPath, body: models.EntryIn, db: Db) -> Any:
    return _run(lambda: service.set_entry(db, item_id, service.parse_month(month), body))


@router.delete("/items/{item_id}/entries/{month}", status_code=204)
def delete_entry(item_id: int, month: MonthPath, db: Db) -> Response:
    _run(lambda: service.delete_entry(db, item_id, service.parse_month(month)))
    return Response(status_code=204)


@router.get("/years/{year}", response_model=models.YearResponse)
def year_report(year: YearPath, db: Db) -> Any:
    return service.year_report(db, year)


@router.get("/summary", response_model=models.SummaryResponse)
def summary(db: Db) -> Any:
    return service.summary(db)
