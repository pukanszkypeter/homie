// Display labels for SmartThings AC enum values - shared between the collapsed stats row
// (AcCardParts) and the expanded controls (AcControls) so the two never drift apart.

export const MODE_LABELS: Record<string, string> = {
  cool: "Cool",
  heat: "Heat",
  dry: "Dry",
  wind: "Fan",
  auto: "Auto",
};

export const FAN_LABELS: Record<string, string> = {
  auto: "Auto",
  low: "Low",
  medium: "Medium",
  high: "High",
  turbo: "Turbo",
};

// No "all" entry - AcControls filters that value out before it ever reaches here (it doesn't
// hold as a real position on this hardware, see UNUSABLE_SWING_MODES).
export const SWING_LABELS: Record<string, string> = {
  off: "Off",
  fixed: "Fixed",
  vertical: "Vertical",
  horizontal: "Horizontal",
};

export const OPTIONAL_MODE_LABELS: Record<string, string> = {
  off: "Off",
  sleep: "Sleep",
  quiet: "Quiet",
  smart: "Smart",
  speed: "Speed",
  windFree: "Wind-Free",
  energySaving: "Energy Saving",
};

// Falls back to a capitalized version of the raw value for anything a unit reports that
// isn't in the map above, rather than hiding it - SmartThings' declared enum is broader than
// what any one unit actually supports, so an unmapped value can still show up for real.
export function labelFor(map: Record<string, string>, value: string): string {
  return map[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
