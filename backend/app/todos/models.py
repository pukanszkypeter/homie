from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TodosStatus = Literal["not_configured", "loading", "sign_in_required", "ok", "unavailable"]


class TodoTask(BaseModel):
    id: str
    title: str
    is_completed: bool
    due_date: dt.date | None
    is_recurring: bool


class TodoList(BaseModel):
    id: str
    name: str
    is_shared: bool
    tasks: list[TodoTask]


class TodosResponse(BaseModel):
    status: TodosStatus
    updated_at: dt.datetime | None
    lists: list[TodoList]


class NewTask(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=255)


class TaskUpdate(BaseModel):
    is_completed: bool
