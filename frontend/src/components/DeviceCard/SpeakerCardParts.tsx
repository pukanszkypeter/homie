import type { DeviceUpdateHandler } from "@/components/DeviceTile/DeviceTile";
import type { SpeakerDevice } from "@/types";
import { SpeakerControls } from "./SpeakerControls";

interface BodyProps {
  device: SpeakerDevice;
  onUpdate: DeviceUpdateHandler;
}

export function SpeakerBody({ device, onUpdate }: BodyProps) {
  return (
    <SpeakerControls
      state={device.state}
      online={device.online}
      onVolume={(volume) => onUpdate(device.id, { volume })}
      onMuted={(is_muted) => onUpdate(device.id, { is_muted })}
    />
  );
}
