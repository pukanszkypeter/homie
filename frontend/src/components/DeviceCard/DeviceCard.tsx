import type { Device, LightState, OutletState, SensorState } from "@/types";
import { LightControls } from "./LightControls";
import { OutletControls } from "./OutletControls";
import { SensorReadout } from "./SensorReadout";
import styles from "./DeviceCard.module.css";

export type DeviceUpdateHandler = (id: string, state: Record<string, unknown>) => void;

interface Props {
  device: Device;
  onUpdate: DeviceUpdateHandler;
}

export function DeviceCard({ device, onUpdate }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.name}>{device.name}</div>
      <div className={styles.body}>
        {device.type === "light" && (
          <LightControls
            state={device.state as LightState}
            onToggle={(is_on) => onUpdate(device.id, { is_on })}
            onBrightness={(brightness) => onUpdate(device.id, { brightness })}
          />
        )}
        {device.type === "outlet" && (
          <OutletControls
            state={device.state as OutletState}
            onToggle={(is_on) => onUpdate(device.id, { is_on })}
          />
        )}
        {device.type === "sensor" && <SensorReadout state={device.state as SensorState} />}
      </div>
    </div>
  );
}
