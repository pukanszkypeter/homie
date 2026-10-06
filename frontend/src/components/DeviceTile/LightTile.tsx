import { Lightbulb, LightbulbOff } from "lucide-react";
import { LightBody } from "@/components/DeviceCard/LightCardParts";
import type { LightDevice } from "@/types";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import { lightStatus } from "@/utils/deviceStatus";
import { DeviceTile, type DeviceUpdateHandler } from "./DeviceTile";

interface Props {
  device: LightDevice;
  onUpdate: DeviceUpdateHandler;
}

export function LightTile({ device, onUpdate }: Props) {
  const { state, online } = device;
  const isOn = state.is_on === true;
  const colorTemp = state.color_temp ?? null;

  return (
    <DeviceTile
      icon={isOn && online ? <Lightbulb size={28} /> : <LightbulbOff size={28} />}
      name={device.name}
      status={lightStatus(device)}
      isOn={isOn}
      online={online}
      tint={colorTemp !== null ? colorTempPercentToRgb(colorTemp) : undefined}
      fill={state.brightness}
      onToggle={(is_on) => onUpdate(device.id, { is_on })}
    >
      <LightBody device={device} onUpdate={onUpdate} />
    </DeviceTile>
  );
}
