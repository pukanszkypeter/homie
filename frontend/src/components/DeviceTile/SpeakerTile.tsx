import { Volume2, VolumeX } from "lucide-react";
import { SpeakerBody } from "@/components/DeviceCard/SpeakerCardParts";
import type { SpeakerDevice } from "@/types";
import { speakerStatus } from "@/utils/deviceStatus";
import { DeviceTile, type DeviceUpdateHandler } from "./DeviceTile";

interface Props {
  device: SpeakerDevice;
  onUpdate: DeviceUpdateHandler;
}

export function SpeakerTile({ device, onUpdate }: Props) {
  const { state, online } = device;
  const isOn = state.is_on === true;
  const isMuted = state.is_muted === true;

  return (
    <DeviceTile
      icon={isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
      name={device.name}
      status={speakerStatus(device)}
      isOn={isOn}
      online={online}
      // Muted reads the same as off - either way, no sound is coming out.
      lit={isOn && !isMuted}
      fill={state.volume ?? undefined}
      onToggle={(is_on) => onUpdate(device.id, { is_on })}
    >
      <SpeakerBody device={device} onUpdate={onUpdate} />
    </DeviceTile>
  );
}
