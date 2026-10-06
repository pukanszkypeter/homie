import type { AcDevice, Device, LightDevice } from "@/types";

export interface FloorSummary {
  lights: LightDevice[];
  acs: AcDevice[];
  // Average of the floor's AC units' own room sensors - whole degrees each, so one unit gives
  // "24°C" and two can give "25.5°C". null when no unit has a reading.
  temperature: string | null;
  lightsOn: number;
  lightsLabel: string;
  acsOn: number;
  acLabel: string;
}

export const isLit = (device: Device): boolean => device.online && device.state.is_on === true;

// A device's `room` holds its floor (Downstairs / Upstairs), in first-seen order.
export function floorNames(devices: Device[]): string[] {
  return Array.from(new Set(devices.map((device) => device.room)));
}

export function summarizeFloor(devices: Device[]): FloorSummary {
  const lights = devices.filter((device): device is LightDevice => device.type === "light");
  const acs = devices.filter((device): device is AcDevice => device.type === "ac");

  const readings = acs
    .filter((ac) => ac.online)
    .map((ac) => ac.state.current_temp)
    .filter((value): value is number => typeof value === "number");
  const average = readings.reduce((sum, value) => sum + value, 0) / readings.length;
  const temperature =
    readings.length === 0 ? null : `${Number.isInteger(average) ? average : average.toFixed(1)}°C`;

  const lightsOn = lights.filter(isLit).length;
  const acsOn = acs.filter(isLit).length;

  let lightsLabel = "Lights off";
  if (lightsOn > 0) lightsLabel = `${lightsOn} ${lightsOn === 1 ? "light" : "lights"} on`;

  let acLabel = "AC off";
  if (acsOn > 0) acLabel = acs.length === 1 ? "AC on" : `${acsOn} of ${acs.length} ACs on`;

  return { lights, acs, temperature, lightsOn, lightsLabel, acsOn, acLabel };
}
