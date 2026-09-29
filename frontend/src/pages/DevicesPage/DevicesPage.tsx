import { PageHeader } from "@/components/PageHeader/PageHeader";
import { useDevices } from "@/hooks/useDevices";
import { RoomSection } from "./RoomSection";

export function DevicesPage() {
  const { devices, updateDevice } = useDevices();

  const rooms = Array.from(new Set(devices.map((d) => d.room)));

  return (
    <>
      <PageHeader title="Devices" />
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
