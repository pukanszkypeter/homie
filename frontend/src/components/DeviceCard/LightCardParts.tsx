import type { DeviceUpdateHandler } from "@/components/DeviceTile/DeviceTile";
import type { LightDevice } from "@/types";
import { LightControls } from "./LightControls";

interface BodyProps {
  device: LightDevice;
  onUpdate: DeviceUpdateHandler;
}

export function LightBody({ device, onUpdate }: BodyProps) {
  const state = device.state;
  const hasColorTemp = state.color_temp !== undefined;
  // A light with no reading yet gets a neutral value here, so the (disabled)
  // slider has something to render, not the actual last-known reading (there isn't one).
  const controlsState = {
    ...state,
    brightness: state.brightness ?? 1,
    color_temp: state.color_temp ?? (hasColorTemp ? 50 : undefined),
  };

  return (
    <LightControls
      state={controlsState}
      notes={device.notes}
      online={device.online}
      onBrightness={(brightness) => onUpdate(device.id, { brightness })}
      onColorTemp={(color_temp) => onUpdate(device.id, { color_temp })}
    />
  );
}
