import { AirVent, Lightbulb, SlidersHorizontal, Thermometer } from "lucide-react";
import { useState } from "react";
import { AcTile } from "@/components/DeviceTile/AcTile";
import type { DeviceUpdateHandler } from "@/components/DeviceTile/DeviceTile";
import { LightTile } from "@/components/DeviceTile/LightTile";
import { SpeakerTile } from "@/components/DeviceTile/SpeakerTile";
import type { Device } from "@/types";
import { summarizeFloor } from "@/utils/floorSummary";
import { FloorLightsDialog } from "./FloorLightsDialog";
import styles from "./FloorSection.module.css";

interface Props {
  name: string;
  devices: Device[];
  onUpdate: DeviceUpdateHandler;
}

function renderTile(device: Device, onUpdate: DeviceUpdateHandler) {
  switch (device.type) {
    case "light":
      return <LightTile key={device.id} device={device} onUpdate={onUpdate} />;
    case "ac":
      return <AcTile key={device.id} device={device} onUpdate={onUpdate} />;
    case "speaker":
      return <SpeakerTile key={device.id} device={device} onUpdate={onUpdate} />;
  }
}

export function FloorSection({ name, devices, onUpdate }: Props) {
  const [lightsOpen, setLightsOpen] = useState(false);

  const { lights, acs, temperature, lightsOn, lightsLabel, acsOn, acLabel } =
    summarizeFloor(devices);
  const others = devices.filter((device) => device.type !== "light");

  return (
    <section className={styles.floor}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{name}</h2>
          <ul className={styles.summary}>
            {temperature && (
              <li className={styles.summaryItem}>
                <Thermometer size={16} aria-hidden />
                {temperature}
              </li>
            )}
            {lights.length > 0 && (
              <li className={`${styles.summaryItem} ${lightsOn > 0 ? styles.summaryActive : ""}`}>
                <Lightbulb size={16} aria-hidden />
                {lightsLabel}
              </li>
            )}
            {acs.length > 0 && (
              <li className={`${styles.summaryItem} ${acsOn > 0 ? styles.summaryActive : ""}`}>
                <AirVent size={16} aria-hidden />
                {acLabel}
              </li>
            )}
          </ul>
        </div>
        {lights.length > 0 && (
          <button type="button" className={styles.lightsButton} onClick={() => setLightsOpen(true)}>
            <SlidersHorizontal size={16} aria-hidden />
            Adjust lights
          </button>
        )}
      </div>

      {lights.length > 0 && (
        <>
          <h3 className={styles.groupLabel}>Lights</h3>
          <div className={styles.grid}>{lights.map((device) => renderTile(device, onUpdate))}</div>
        </>
      )}
      {others.length > 0 && (
        <>
          <h3 className={styles.groupLabel}>Climate &amp; audio</h3>
          <div className={styles.grid}>{others.map((device) => renderTile(device, onUpdate))}</div>
        </>
      )}

      {lightsOpen && (
        <FloorLightsDialog
          floor={name}
          lights={lights}
          onUpdate={onUpdate}
          onClose={() => setLightsOpen(false)}
        />
      )}
    </section>
  );
}
