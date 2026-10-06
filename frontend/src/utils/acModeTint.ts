// Auto has no tint of its own on purpose - it falls back to the default accent.
const MODE_TINTS: Record<string, string> = {
  cool: "var(--color-chart-blue)",
  heat: "var(--color-chart-coral)",
  dry: "var(--color-chart-cyan)",
  wind: "var(--color-chart-green)",
};

export function acModeTint(mode: string | null): string | undefined {
  return mode ? MODE_TINTS[mode] : undefined;
}
