import type { DeviceUpdateHandler } from "@/components/DeviceTile/DeviceTile";
import type { AcDevice } from "@/types";
import { AcControls } from "./AcControls";

interface BodyProps {
  device: AcDevice;
  onUpdate: DeviceUpdateHandler;
}

export function AcBody({ device, onUpdate }: BodyProps) {
  return (
    <AcControls
      state={device.state}
      online={device.online}
      onMode={(mode) => onUpdate(device.id, { mode })}
      onFanMode={(fan_mode) => onUpdate(device.id, { fan_mode })}
      onSwingMode={(swing_mode) => onUpdate(device.id, { swing_mode })}
      onOptionalMode={(optional_mode) => onUpdate(device.id, { optional_mode })}
      onTargetTemp={(target_temp) => onUpdate(device.id, { target_temp })}
      onAutoClean={(auto_clean) => onUpdate(device.id, { auto_clean })}
    />
  );
}
