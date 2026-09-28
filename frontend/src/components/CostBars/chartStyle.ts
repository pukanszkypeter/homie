/** Shared recharts styling so every cost chart matches the dark theme. */
export const AXIS_TICK = { fill: "var(--color-text-muted)", fontSize: 13 };

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-surface-raised)",
    border: 0,
    borderRadius: 12,
    color: "var(--color-text)",
  },
  itemStyle: { color: "var(--color-text)" },
  labelStyle: { color: "var(--color-text-muted)" },
  cursor: { fill: "rgb(255 255 255 / 6%)" },
};
