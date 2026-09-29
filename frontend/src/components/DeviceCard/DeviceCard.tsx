import { useState } from "react";
import type { Device, LightState } from "@/types";
import { brightnessPercentToRgba } from "@/utils/brightnessColor";
import { colorTempPercentToRgb } from "@/utils/colorTemp";
import { ToggleButton } from "./ToggleButton";
import { LightControls } from "./LightControls";
import { StatItem } from "./StatItem";
import styles from "./DeviceCard.module.css";

export type DeviceUpdateHandler = (id: string, state: Record<string, unknown>) => void;

interface Props {
  device: Device;
  onUpdate: DeviceUpdateHandler;
}

export function DeviceCard({ device, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const state = device.state as LightState;
  const colorSwatch =
    state.color_temp !== undefined ? colorTempPercentToRgb(state.color_temp) : undefined;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.name}>{device.name}</div>
        <ToggleButton
          isOn={state.is_on}
          compact
          onToggle={(is_on) => onUpdate(device.id, { is_on })}
        />
      </div>
      {!expanded && (
        <div className={styles.statsRow}>
          <StatItem
            icon={
              <span
                className={styles.statColorDot}
                style={{ background: brightnessPercentToRgba(state.brightness) }}
              />
            }
            label="Brightness"
            value={`${state.brightness}%`}
          />
          {state.color_temp !== undefined && (
            <StatItem
              icon={<span className={styles.statColorDot} style={{ background: colorSwatch }} />}
              label="Color Temp"
              value={`${state.color_temp}%`}
            />
          )}
        </div>
      )}
      {expanded && (
        <div className={styles.body}>
          <LightControls
            state={state}
            notes={device.notes}
            onBrightness={(brightness) => onUpdate(device.id, { brightness })}
            onColorTemp={(color_temp) => onUpdate(device.id, { color_temp })}
          />
        </div>
      )}
      <button
        type="button"
        className={styles.expandBar}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse controls" : "Expand controls"}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={styles.expandArrow} aria-hidden>
          &#9660;
        </span>
      </button>
    </div>
  );
}
