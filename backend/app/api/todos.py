from __future__ import annotations

from collections.abc import Awaitable

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

from ..todos.client import TodoNotFoundError, TodoUnavailableError
from ..todos.models import NewTask, TaskUpdate, TodosResponse, TodoTask
from ..todos.service import TodoService

router = APIRouter(prefix="/api/todos", tags=["todos"])


def _service(request: Request) -> TodoService:
    return request.app.state.todos


async def _translate_errors[T](call: Awaitable[T]) -> T:
    try:
        return await call
    except TodoNotFoundError:
        raise HTTPException(status_code=404, detail="Unknown list or task") from None
    except TodoUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Microsoft Graph request failed") from None


@router.get("", response_model=TodosResponse)
async def get_todos(request: Request) -> TodosResponse:
    return _service(request).get()


@router.post("/lists/{list_id}/tasks", response_model=TodoTask, status_code=201)
async def add_task(list_id: str, body: NewTask, request: Request) -> TodoTask:
    return await _translate_errors(_service(request).add_task(list_id, body.title))


@router.patch("/lists/{list_id}/tasks/{task_id}", response_model=TodoTask)
async def update_task(list_id: str, task_id: str, body: TaskUpdate, request: Request) -> TodoTask:
    return await _translate_errors(
        _service(request).set_completed(list_id, task_id, body.is_completed)
    )


@router.delete("/lists/{list_id}/tasks/{task_id}", status_code=204)
async def delete_task(list_id: str, task_id: str, request: Request) -> Response:
    await _translate_errors(_service(request).delete_task(list_id, task_id))
    return Response(status_code=204)
