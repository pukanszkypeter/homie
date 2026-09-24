from __future__ import annotations

import logging
from pathlib import Path

from pydantic import TypeAdapter

from .models import Location

logger = logging.getLogger(__name__)

LOCATIONS_FILE = Path(__file__).resolve().parents[2] / "locations.json"


def load_locations(path: Path = LOCATIONS_FILE) -> list[Location]:
    """Load the configured places; the first entry is the home location."""
    if not path.exists():
        logger.warning(
            "%s not found - copy locations.example.json to enable the weather widget", path.name
        )
        return []
    return TypeAdapter(list[Location]).validate_json(path.read_text(encoding="utf-8"))
