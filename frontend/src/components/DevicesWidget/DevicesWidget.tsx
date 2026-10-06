import { Volume2, VolumeX } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { AcModeIcon } from "@/components/DeviceTile/AcModeIcon";
import { useDevices } from "@/hooks/useDevices";
import type { Device, LightDevice } from "@/types";
import { acModeTint } from "@/utils/acModeTint";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import { acStatus, speakerStatus } from "@/utils/deviceStatus";
import { floorNames, isLit, summarizeFloor } from "@/utils/floorSummary";
import styles from "./DevicesWidget.module.css";

// Same tint a lit lamp's tile gets on the Devices screen: its real color temperature, or the
// accent for a lamp without one.
function lampColor(light: LightDevice): string {
  const colorTemp = light.state.color_temp;
  return typeof colorTemp === "number" ? colorTempPercentToRgb(colorTemp) : "var(--color-accent)";
}

interface Row {
  id: string;
  icon: ReactNode;
  name: string;
  status: string;
  active: boolean;
  tint?: string;
}

// Lamps are summed up as dots; everything else on the floor gets a line of its own.
function deviceRows(devices: Device[]): Row[] {
  const rows: Row[] = [];
  for (const device of devices) {
    if (device.type === "ac") {
      rows.push({
        id: device.id,
        icon: <AcModeIcon mode={device.state.mode} size={18} />,
        name: device.name,
        status: acStatus(device),
        active: isLit(device),
        tint: acModeTint(device.state.mode),
      });
    } else if (device.type === "speaker") {
      const muted = device.state.is_muted === true;
      rows.push({
        id: device.id,
        icon: muted ? <VolumeX size={18} /> : <Volume2 size={18} />,
        name: device.name,
        status: speakerStatus(device),
        active: isLit(device) && !muted,
      });
    }
  }
  return rows;
}

// Read-only on purpose: the whole Home card is one link to the Devices screen, and a control
// can't sit inside a link.
export function DevicesWidget() {
  const { devices, error } = useDevices();

  if (devices.length === 0) {
    return <p className={styles.message}>{error ? "Devices unavailable" : "No devices yet"}</p>;
  }

  return (
    <div className={styles.floors}>
      {floorNames(devices).map((floor) => {
        const floorDevices = devices.filter((device) => device.room === floor);
        const summary = summarizeFloor(floorDevices);
        return (
          <div key={floor} className={styles.floor}>
            <div>
              <div className={styles.name}>{floor}</div>
              <div className={styles.temperature}>{summary.temperature ?? "—"}</div>
            </div>

            {summary.lights.length > 0 && (
              <div className={styles.lighting}>
                <div className={styles.lamps} aria-hidden>
                  {summary.lights.map((light) => (
                    <span
                      key={light.id}
                      className={`${styles.lamp} ${isLit(light) ? styles.lampOn : ""}`}
                      style={{ "--lamp-color": lampColor(light) } as CSSProperties}
                    />
                  ))}
                </div>
                <span className={summary.lightsOn > 0 ? styles.active : ""}>
                  {summary.lightsLabel}
                </span>
              </div>
            )}

            <ul className={styles.rows}>
              {deviceRows(floorDevices).map((row) => (
                <li
                  key={row.id}
                  className={`${styles.row} ${row.active ? styles.rowActive : ""}`}
                  style={row.tint ? ({ "--row-tint": row.tint } as CSSProperties) : undefined}
                >
                  <span className={styles.rowIcon} aria-hidden>
                    {row.icon}
                  </span>
                  <span className={styles.rowName}>{row.name}</span>
                  <span className={styles.rowStatus}>{row.status}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
