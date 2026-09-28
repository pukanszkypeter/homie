"""The colors a section can have in the charts. The frontend maps each key to an actual
color in `styles/tokens.css` (`--color-chart-<key>`); keep the two lists in sync."""

from typing import Literal, get_args

CostColor = Literal["yellow", "blue", "coral", "purple", "green", "orange", "cyan", "lime", "pink"]

# In the order new sections are given them: neighbors in this list are easy to tell apart.
COST_COLORS: tuple[str, ...] = get_args(CostColor)
