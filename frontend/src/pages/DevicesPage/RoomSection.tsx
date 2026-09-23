import { DeviceCard, type DeviceUpdateHandler } from "@/components/DeviceCard/DeviceCard";
import type { Device } from "@/types";
import styles from "./RoomSection.module.css";

interface Props {
  name: string;
  devices: Device[];
  onUpdate: DeviceUpdateHandler;
}

export function RoomSection({ name, devices, onUpdate }: Props) {
  return (
    <section className={styles.room}>
      <h2 className={styles.title}>{name}</h2>
      <div className={styles.grid}>
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} onUpdate={onUpdate} />
        ))}
      </div>
    </section>
  );
}
