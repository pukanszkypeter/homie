import { AirVent, Droplets, Fan, Flame, Snowflake, Sparkles } from "lucide-react";

interface Props {
  mode: string | null;
  size: number;
}

// Only covers acLabels' MODE_LABELS keys - a mode a unit reports that isn't in that map falls
// back to a generic icon here, the same way its label falls back to the raw name there.
export function AcModeIcon({ mode, size }: Props) {
  switch (mode) {
    case "cool":
      return <Snowflake size={size} />;
    case "heat":
      return <Flame size={size} />;
    case "dry":
      return <Droplets size={size} />;
    case "wind":
      return <Fan size={size} />;
    case "auto":
      return <Sparkles size={size} />;
    default:
      return <AirVent size={size} />;
  }
}
