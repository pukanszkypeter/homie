import { AcBody } from "@/components/DeviceCard/AcCardParts";
import type { AcDevice } from "@/types";
import { acModeTint } from "@/utils/acModeTint";
import { acStatus } from "@/utils/deviceStatus";
import { AcModeIcon } from "./AcModeIcon";
import { DeviceTile, type DeviceUpdateHandler } from "./DeviceTile";

interface Props {
  device: AcDevice;
  onUpdate: DeviceUpdateHandler;
}

export function AcTile({ device, onUpdate }: Props) {
  const { state, online } = device;

  return (
    <DeviceTile
      icon={<AcModeIcon mode={state.mode} size={28} />}
      name={device.name}
      status={acStatus(device)}
      detail={state.current_temp != null ? `Room ${state.current_temp}°C` : undefined}
      warning={state.filter_status === "wash" ? "Filter needs washing" : undefined}
      isOn={state.is_on === true}
      online={online}
      tint={acModeTint(state.mode)}
      onToggle={(is_on) => onUpdate(device.id, { is_on })}
    >
      <AcBody device={device} onUpdate={onUpdate} />
    </DeviceTile>
  );
}
