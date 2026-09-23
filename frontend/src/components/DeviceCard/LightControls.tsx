import type { LightState } from "@/types";
import { ToggleButton } from "./ToggleButton";
import styles from "./DeviceCard.module.css";

interface Props {
  state: LightState;
  onToggle: (value: boolean) => void;
  onBrightness: (value: number) => void;
}

export function LightControls({ state, onToggle, onBrightness }: Props) {
  return (
    <>
      <ToggleButton isOn={state.is_on} onToggle={onToggle} />
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={100}
        value={state.brightness}
        disabled={!state.is_on}
        aria-label="Brightness"
        onChange={(e) => onBrightness(Number(e.target.value))}
      />
      <span className={styles.detail}>{state.brightness}%</span>
    </>
  );
}
