"""Database engine and session handling for the costs data."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import Request
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from ..config import BACKEND_DIR, Settings


def create_db_engine(url: str | Path | None = None) -> Engine:
    """Create the engine. `url` is a full SQLAlchemy URL (e.g. the Postgres one in
    Settings, used by default); pass a filesystem Path instead to get a throwaway
    SQLite database at that path - handy for tests, since it needs no server."""
    if url is None:
        url = Settings().database_url
    if isinstance(url, Path):
        url.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{url}"
    engine = create_engine(url)

    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def _configure(dbapi_connection, _record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")  # SQLite ignores foreign keys unless asked
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


def migrate(engine: Engine, revision: str = "head") -> None:
    """Bring the database up to the latest schema (see migrations/).

    Some SQLite schema changes (like adding a NOT NULL constraint) can only be done by
    recreating the table. SQLite applies an implicit cascading delete to every dependent
    row when the old table is dropped as part of that, unless foreign key enforcement is
    off first - and that pragma only takes effect outside of a transaction, so it has to
    be set before the migration's own transaction opens. Postgres alters columns in
    place, so none of this applies there.
    """
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    is_sqlite = engine.dialect.name == "sqlite"
    with engine.connect() as connection:
        if is_sqlite:
            connection.execute(text("PRAGMA foreign_keys=OFF"))
            connection.commit()  # close the autobegin transaction so the migration can open its own
        with connection.begin():
            config.attributes["connection"] = connection
            command.upgrade(config, revision)
        if is_sqlite:
            connection.execute(text("PRAGMA foreign_keys=ON"))
            connection.commit()


def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(engine, expire_on_commit=False)


def get_session(request: Request) -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    with request.app.state.db_sessions() as session:
        yield session
