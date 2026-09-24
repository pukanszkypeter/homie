"""Deletes old completed tasks from every list.

As a command (dry run unless --delete):  python -m app.todos.cleanup --days 30 [--delete]
As a daily background job when MS_TODO_CLEANUP_DAYS is set in backend/.env.

Only ids and completion times are read, never task titles. Deleting is permanent.
"""

from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import logging
from dataclasses import dataclass

import httpx

from ..config import TOKEN_CACHE_FILE, Settings
from .auth import TokenProvider
from .client import GraphTodoClient, TodoError, TodoNotFoundError

logger = logging.getLogger(__name__)

RUN_INTERVAL_SECONDS = 24 * 60 * 60
STARTUP_DELAY_SECONDS = 60
# A safety net against a runaway delete: anything left is picked up on the next run.
MAX_DELETES_PER_RUN = 500


@dataclass
class ListResult:
    name: str
    count: int


async def cleanup_completed(
    client: GraphTodoClient, older_than_days: int, *, delete: bool
) -> list[ListResult]:
    """Delete (or, without `delete`, just count) completed tasks older than the cutoff."""
    cutoff = dt.datetime.now(dt.UTC) - dt.timedelta(days=older_than_days)
    results: list[ListResult] = []
    budget = MAX_DELETES_PER_RUN
    for list_id, name in await client.all_lists():
        task_ids = await client.completed_task_ids_before(list_id, cutoff)
        if delete:
            task_ids = task_ids[:budget]
            for task_id in task_ids:
                try:
                    await client.delete_task(list_id, task_id)
                except TodoNotFoundError:
                    pass  # already gone
            budget -= len(task_ids)
        results.append(ListResult(name, len(task_ids)))
        if delete and budget <= 0:
            break
    return results


async def run_todo_cleanup(client: GraphTodoClient, older_than_days: int) -> None:
    await asyncio.sleep(STARTUP_DELAY_SECONDS)
    while True:
        try:
            results = await cleanup_completed(client, older_than_days, delete=True)
            deleted = sum(result.count for result in results)
            if deleted:
                logger.info("To Do cleanup: deleted %d completed task(s)", deleted)
        except (httpx.HTTPError, TodoError, KeyError, ValueError) as exc:
            logger.warning("To Do cleanup failed: %s", exc)
        await asyncio.sleep(RUN_INTERVAL_SECONDS)


async def _run_command(days: int, delete: bool) -> None:
    settings = Settings()
    client = GraphTodoClient(
        TokenProvider(settings.ms_client_id, TOKEN_CACHE_FILE), [], settings.tzinfo
    )
    try:
        results = await cleanup_completed(client, days, delete=delete)
    finally:
        await client.aclose()

    verb = "deleted" if delete else "would delete"
    note = "" if delete else "DRY RUN - nothing was deleted. "
    print(f"{note}Completed tasks older than {days} days:")
    for result in results:
        print(f"  {result.name}: {verb} {result.count}")
    print(f"Total {verb}: {sum(result.count for result in results)}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Delete completed To Do tasks older than N days from ALL lists. "
        "Dry run unless --delete is given."
    )
    parser.add_argument("--days", type=int, help="age in days (default: MS_TODO_CLEANUP_DAYS)")
    parser.add_argument("--delete", action="store_true", help="actually delete (permanent)")
    args = parser.parse_args()

    settings = Settings()
    days = args.days if args.days is not None else settings.ms_todo_cleanup_days
    if days <= 0:
        raise SystemExit("Give --days N, or set MS_TODO_CLEANUP_DAYS in backend/.env")
    if not settings.ms_client_id:
        raise SystemExit("MS_CLIENT_ID is not set in backend/.env")
    asyncio.run(_run_command(days, args.delete))


if __name__ == "__main__":
    main()
