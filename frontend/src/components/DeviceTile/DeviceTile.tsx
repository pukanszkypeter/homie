import { SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ControlGroup, ControlRow } from "@/components/DeviceCard/ControlRow";
import { ToggleButton } from "@/components/DeviceCard/ToggleButton";
import { Dialog } from "@/components/Dialog/Dialog";
import styles from "./DeviceTile.module.css";

export type DeviceUpdateHandler = (id: string, state: Record<string, unknown>) => void;

interface Props {
  icon: ReactNode;
  name: string;
  status: string;
  // An optional second, quieter line under the status (e.g. an AC's room temperature).
  detail?: string;
  // Something that needs attention (e.g. a dirty filter) - flagged on the tile, spelled out
  // in the dialog.
  warning?: string;
  isOn: boolean;
  online: boolean;
  // Whether the tile shows its tinted "active" look - defaults to isOn, but a device can be
  // on and still read as inactive (a muted speaker).
  lit?: boolean;
  // Any CSS color - tints the whole tile while it's lit.
  tint?: string;
  // 0-100, how much of the tile the stronger tint fills from the bottom (brightness, volume).
  fill?: number;
  onToggle: (value: boolean) => void;
  // The device's full controls, shown in the dialog under the power row.
  children: ReactNode;
}

export function DeviceTile({
  icon,
  name,
  status,
  detail,
  warning,
  isOn,
  online,
  lit = isOn,
  tint = "var(--color-accent)",
  fill = 100,
  onToggle,
  children,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showLit = lit && online;

  return (
    <>
      <div
        className={`${styles.tile} ${showLit ? styles.tileOn : ""} ${online ? "" : styles.tileOffline}`}
        style={{ "--tile-tint": tint, "--tile-fill": `${fill}%` } as CSSProperties}
      >
        <button
          type="button"
          className={styles.main}
          aria-pressed={isOn}
          aria-label={[name, status, warning].filter(Boolean).join(", ")}
          disabled={!online}
          onClick={() => onToggle(!isOn)}
        >
          <span className={styles.icons} aria-hidden>
            <span className={styles.icon}>{icon}</span>
            {warning && <TriangleAlert size={18} className={styles.warningIcon} />}
          </span>
          <span className={styles.text}>
            <span className={styles.name}>{name}</span>
            <span className={styles.status}>{status}</span>
            {detail && <span className={styles.detail}>{detail}</span>}
          </span>
        </button>
        <button
          type="button"
          className={styles.details}
          aria-label={`${name} settings`}
          onClick={() => setDetailsOpen(true)}
        >
          <SlidersHorizontal size={18} aria-hidden />
        </button>
      </div>
      {detailsOpen && (
        <Dialog title={name} size="compact" onClose={() => setDetailsOpen(false)}>
          <div className={styles.sheet}>
            {warning && (
              <p className={styles.sheetWarning}>
                <TriangleAlert size={18} aria-hidden />
                {warning}
              </p>
            )}
            <ControlGroup>
              <ControlRow label="Power">
                <ToggleButton isOn={isOn} compact disabled={!online} onToggle={onToggle} />
              </ControlRow>
            </ControlGroup>
            {children}
          </div>
        </Dialog>
      )}
    </>
  );
}
