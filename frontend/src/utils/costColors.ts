import type { CostColor } from "@/types";

/** The colors a section can take, in the order the backend hands them out. */
export const COST_COLORS: { key: CostColor; label: string }[] = [
  { key: "yellow", label: "Yellow" },
  { key: "blue", label: "Blue" },
  { key: "coral", label: "Coral" },
  { key: "purple", label: "Purple" },
  { key: "green", label: "Green" },
  { key: "orange", label: "Orange" },
  { key: "cyan", label: "Cyan" },
  { key: "lime", label: "Lime" },
  { key: "pink", label: "Pink" },
];

/** The CSS color for a section color (defined in styles/tokens.css). */
export const costColorVar = (key: CostColor) => `var(--color-chart-${key})`;
