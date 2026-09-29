// The accent color's RGB channels (--color-accent in tokens.css) - hardcoded here since
// varying opacity needs the raw channels, not just a reference to the CSS variable.
const ACCENT_RGB = "245, 197, 24";
// A fully transparent dot at 1% would look like no dot at all - floor it so "dim" still reads
// as "a color, just faint" rather than "nothing here."
const MIN_OPACITY = 0.25;

export function brightnessPercentToRgba(percent: number): string {
  const opacity = MIN_OPACITY + (percent / 100) * (1 - MIN_OPACITY);
  return `rgba(${ACCENT_RGB}, ${opacity})`;
}
