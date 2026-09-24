from __future__ import annotations

import asyncio
import datetime as dt
import logging

import httpx

from .client import GraphTodoClient, TodoAuthError, TodoNotFoundError, TodoUnavailableError
from .models import TodoList, TodosResponse, TodosStatus, TodoTask

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 60


class TodoService:
    """Caches the user's lists and open tasks so every client reads from one copy."""

    def __init__(self, client: GraphTodoClient | None) -> None:
        self._client = client
        self._lists: list[TodoList] = []
        self._updated_at: dt.datetime | None = None
        self._status: TodosStatus = "not_configured" if client is None else "loading"
        # Serialises refreshes and writes so a slow refresh cannot overwrite a newer change.
        self._lock = asyncio.Lock()

    def get(self) -> TodosResponse:
        return TodosResponse(status=self._status, updated_at=self._updated_at, lists=self._lists)

    async def refresh(self) -> None:
        """Fetch fresh data; on a temporary failure keep serving what we have."""
        client = self._require_client()
        async with self._lock:
            try:
                self._lists = await client.fetch_all()
            except TodoAuthError:
                self._lists = []
                self._updated_at = None
                self._status = "sign_in_required"
                return
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                logger.warning("To Do refresh failed: %s", exc)
                if self._updated_at is None:
                    self._status = "unavailable"
                return
            self._updated_at = dt.datetime.now(dt.UTC)
            self._status = "ok"

    async def add_task(self, list_id: str, title: str) -> TodoTask:
        client = self._require_client()
        async with self._lock:
            todo_list = self._require_list(list_id)
            task = await client.create_task(list_id, title)
            todo_list.tasks.append(task)
        return task

    async def set_completed(self, list_id: str, task_id: str, completed: bool) -> TodoTask:
        client = self._require_client()
        async with self._lock:
            todo_list = self._require_list(list_id)
            self._require_task(todo_list, task_id)
            task = await client.set_completed(list_id, task_id, completed)
            if task.is_completed:
                # Only open tasks are cached, so a completed task drops out of the list.
                todo_list.tasks = [t for t in todo_list.tasks if t.id != task_id]
            else:
                # A recurring task advances in place: Microsoft answers with the same task,
                # reopened with its next due date, and keeps the finished occurrence as a
                # separate completed task. Replace it where it was.
                todo_list.tasks = [task if t.id == task_id else t for t in todo_list.tasks]
        return task

    async def delete_task(self, list_id: str, task_id: str) -> None:
        client = self._require_client()
        async with self._lock:
            todo_list = self._require_list(list_id)
            self._require_task(todo_list, task_id)
            await client.delete_task(list_id, task_id)
            todo_list.tasks = [t for t in todo_list.tasks if t.id != task_id]

    def _require_list(self, list_id: str) -> TodoList:
        # Ids are checked against our own data: Graph answers 400 for unknown list ids and
        # silently succeeds for some unknown task ids, so it can't be relied on for 404s.
        if self._status != "ok":
            raise TodoUnavailableError("To Do is not available right now")
        todo_list = next((item for item in self._lists if item.id == list_id), None)
        if todo_list is None:
            raise TodoNotFoundError(list_id)
        return todo_list

    @staticmethod
    def _require_task(todo_list: TodoList, task_id: str) -> None:
        if not any(task.id == task_id for task in todo_list.tasks):
            raise TodoNotFoundError(task_id)

    def _require_client(self) -> GraphTodoClient:
        if self._client is None:
            raise TodoAuthError("Microsoft To Do is not configured")
        return self._client


async def run_todo_refresher(service: TodoService) -> None:
    while True:
        await service.refresh()
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
