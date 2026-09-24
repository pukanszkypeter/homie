from __future__ import annotations

import asyncio
import datetime as dt
from typing import Any

import httpx

from .auth import TokenProvider
from .models import TodoList, TodoTask

GRAPH_URL = "https://graph.microsoft.com/v1.0/me/todo"
PAGE_SIZE = 100


class TodoError(Exception):
    pass


class TodoUnavailableError(TodoError):
    """To Do can't be used right now (not configured, not signed in, or not loaded yet)."""


class TodoAuthError(TodoUnavailableError):
    """Nobody is signed in, or Microsoft rejected the token."""


class TodoNotFoundError(TodoError):
    pass


class GraphTodoClient:
    """Thin async wrapper over the Microsoft Graph To Do API."""

    def __init__(self, tokens: TokenProvider, list_names: list[str], timezone: dt.tzinfo) -> None:
        self._tokens = tokens
        self._timezone = timezone
        self._list_names = {name.casefold() for name in list_names}
        self._http = httpx.AsyncClient(timeout=15)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def fetch_all(self) -> list[TodoList]:
        """The allowed lists with their open tasks. Other lists are never read."""
        lists = await self._get_all("/lists")
        wanted = [item for item in lists if item["displayName"].casefold() in self._list_names]
        tasks = await asyncio.gather(*(self._open_tasks(item["id"]) for item in wanted))
        return [
            TodoList(
                id=item["id"],
                name=item["displayName"],
                is_shared=bool(item.get("isShared")),
                tasks=list_tasks,
            )
            for item, list_tasks in zip(wanted, tasks, strict=True)
        ]

    async def all_lists(self) -> list[tuple[str, str]]:
        """(id, name) of every list on the account, including ones we never display."""
        return [(item["id"], item["displayName"]) for item in await self._get_all("/lists")]

    async def completed_task_ids_before(self, list_id: str, cutoff: dt.datetime) -> list[str]:
        """Ids of tasks completed before `cutoff`. Reads only ids and completion times."""
        items = await self._get_all(
            f"/lists/{list_id}/tasks",
            {
                "$filter": "status eq 'completed'",
                "$select": "id,completedDateTime",
                "$top": PAGE_SIZE,
            },
        )
        return [
            item["id"]
            for item in items
            if (completed_at := _completed_at(item)) is not None and completed_at < cutoff
        ]

    async def create_task(self, list_id: str, title: str) -> TodoTask:
        data = await self._request("POST", f"/lists/{list_id}/tasks", json={"title": title})
        return _parse_task(data, self._timezone)

    async def set_completed(self, list_id: str, task_id: str, completed: bool) -> TodoTask:
        status = "completed" if completed else "notStarted"
        data = await self._request(
            "PATCH", f"/lists/{list_id}/tasks/{task_id}", json={"status": status}
        )
        return _parse_task(data, self._timezone)

    async def delete_task(self, list_id: str, task_id: str) -> None:
        await self._request("DELETE", f"/lists/{list_id}/tasks/{task_id}")

    async def _open_tasks(self, list_id: str) -> list[TodoTask]:
        items = await self._get_all(
            f"/lists/{list_id}/tasks", {"$filter": "status ne 'completed'", "$top": PAGE_SIZE}
        )
        return [_parse_task(item, self._timezone) for item in items]

    async def _get_all(self, path: str, params: dict[str, Any] | None = None) -> list[Any]:
        items: list[Any] = []
        url: str | None = f"{GRAPH_URL}{path}"
        while url:
            data = await self._request("GET", url, params=params)
            items.extend(data["value"])
            url = data.get("@odata.nextLink")
            params = None  # the next link already carries the query
        return items

    async def _request(
        self,
        method: str,
        path_or_url: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> Any:
        token = await asyncio.to_thread(self._tokens.get_token)
        if token is None:
            raise TodoAuthError("Not signed in to Microsoft")
        url = path_or_url if path_or_url.startswith("https://") else f"{GRAPH_URL}{path_or_url}"
        response = await self._http.request(
            method, url, params=params, json=json, headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 401:
            raise TodoAuthError("Microsoft rejected the sign-in")
        if response.status_code == 404:
            raise TodoNotFoundError(path_or_url)
        response.raise_for_status()
        return None if response.status_code == 204 else response.json()


def _completed_at(item: dict[str, Any]) -> dt.datetime | None:
    """Completion time in UTC, or None if missing or not reported in UTC (then we skip it)."""
    completed = item.get("completedDateTime")
    if not completed or completed.get("timeZone") != "UTC":
        return None
    return dt.datetime.fromisoformat(completed["dateTime"][:19]).replace(tzinfo=dt.UTC)


def _due_date(data: dict[str, Any], timezone: dt.tzinfo) -> dt.date | None:
    """The calendar day the user picked. To Do stores it as local midnight, reported in UTC
    (midnight on the 27th in UTC+2 arrives as the 26th at 22:00), so convert before reading."""
    due = data.get("dueDateTime")
    if not due:
        return None
    moment = dt.datetime.fromisoformat(due["dateTime"][:19])
    if due.get("timeZone") == "UTC":
        moment = moment.replace(tzinfo=dt.UTC).astimezone(timezone)
    return moment.date()


def _parse_task(data: dict[str, Any], timezone: dt.tzinfo) -> TodoTask:
    return TodoTask(
        id=data["id"],
        title=data["title"],
        is_completed=data["status"] == "completed",
        due_date=_due_date(data, timezone),
        is_recurring=bool(data.get("recurrence")),
    )
