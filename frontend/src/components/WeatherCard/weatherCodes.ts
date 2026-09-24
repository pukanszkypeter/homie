import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";

interface Condition {
  label: string;
  day: LucideIcon;
  night: LucideIcon;
}

const same = (label: string, icon: LucideIcon): Condition => ({ label, day: icon, night: icon });

// WMO weather interpretation codes, as returned by Open-Meteo.
const conditions: Record<number, Condition> = {
  0: { label: "Clear sky", day: Sun, night: Moon },
  1: { label: "Mostly clear", day: Sun, night: Moon },
  2: { label: "Partly cloudy", day: CloudSun, night: CloudMoon },
  3: same("Overcast", Cloud),
  45: same("Fog", CloudFog),
  48: same("Freezing fog", CloudFog),
  51: same("Light drizzle", CloudDrizzle),
  53: same("Drizzle", CloudDrizzle),
  55: same("Heavy drizzle", CloudDrizzle),
  56: same("Freezing drizzle", CloudDrizzle),
  57: same("Heavy freezing drizzle", CloudDrizzle),
  61: same("Light rain", CloudRain),
  63: same("Rain", CloudRain),
  65: same("Heavy rain", CloudRain),
  66: same("Freezing rain", CloudRain),
  67: same("Heavy freezing rain", CloudRain),
  71: same("Light snow", CloudSnow),
  73: same("Snow", CloudSnow),
  75: same("Heavy snow", CloudSnow),
  77: same("Snow grains", Snowflake),
  80: same("Light showers", CloudRain),
  81: same("Showers", CloudRain),
  82: same("Heavy showers", CloudRain),
  85: same("Snow showers", CloudSnow),
  86: same("Heavy snow showers", CloudSnow),
  95: same("Thunderstorm", CloudLightning),
  96: same("Thunderstorm with hail", CloudHail),
  99: same("Severe thunderstorm with hail", CloudHail),
};

const unknown = same("Unknown", Cloud);

export function describeWeather(code: number, isDay: boolean): { label: string; icon: LucideIcon } {
  const condition = conditions[code] ?? unknown;
  return { label: condition.label, icon: isDay ? condition.day : condition.night };
}
