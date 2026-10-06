import { PageHeader } from "@/components/PageHeader/PageHeader";
import { useDevices } from "@/hooks/useDevices";
import { floorNames } from "@/utils/floorSummary";
import { FloorSection } from "./FloorSection";

export function DevicesPage() {
  const { devices, updateDevice } = useDevices();

  const floors = floorNames(devices);

  return (
    <>
      <PageHeader title="Devices" />
      {floors.map((floor) => (
        <FloorSection
          key={floor}
          name={floor}
          devices={devices.filter((d) => d.room === floor)}
          onUpdate={updateDevice}
        />
      ))}
    </>
  );
}
