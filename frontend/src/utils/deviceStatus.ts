import { MODE_LABELS, labelFor } from "@/components/DeviceCard/acLabels";
import type { AcDevice, LightDevice, SpeakerDevice } from "@/types";

// The one-line state shown on a device's tile and on the Home card - kept in one place so the
// two can't describe the same device differently.

function colorTempLabel(percent: number): string {
  if (percent < 34) return "Warm";
  if (percent < 67) return "Neutral";
  return "Cold";
}

export function lightStatus({ state, online }: LightDevice): string {
  if (!online) return "Offline";
  if (state.is_on !== true) return "Off";
  // A light that has never been polled successfully has no brightness at all yet.
  if (state.brightness === undefined) return "On";
  return typeof state.color_temp === "number"
    ? `${state.brightness}% · ${colorTempLabel(state.color_temp)}`
    : `${state.brightness}%`;
}

export function acStatus({ state, online }: AcDevice): string {
  if (!online) return "Offline";
  if (state.is_on !== true) return "Off";
  if (!state.mode) return "On";
  // Fan-only mode has no target temperature to speak of (see AcControls' isTempLocked).
  const showTarget = state.mode !== "wind" && state.target_temp != null;
  return showTarget
    ? `${labelFor(MODE_LABELS, state.mode)} · ${state.target_temp}°C`
    : labelFor(MODE_LABELS, state.mode);
}

export function speakerStatus({ state, online }: SpeakerDevice): string {
  if (!online) return "Offline";
  if (state.is_on !== true) return "Off";
  if (state.is_muted === true) return "Muted";
  return state.volume != null ? `${state.volume}%` : "On";
}
