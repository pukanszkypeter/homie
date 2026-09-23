import { PageHeader } from "@/components/PageHeader/PageHeader";
import { useDevices } from "@/hooks/useDevices";
import { RoomSection } from "./RoomSection";
import styles from "./DevicesPage.module.css";

export function DevicesPage() {
  const { devices, error, updateDevice } = useDevices();

  const rooms = Array.from(new Set(devices.map((d) => d.room)));

  return (
    <>
      <PageHeader title="Devices">
        {error && <span className={styles.error}>{error}</span>}
      </PageHeader>
      {rooms.map((room) => (
        <RoomSection
          key={room}
          name={room}
          devices={devices.filter((d) => d.room === room)}
          onUpdate={updateDevice}
        />
      ))}
    </>
  );
}
