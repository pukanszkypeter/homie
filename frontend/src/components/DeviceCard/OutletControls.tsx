import type { OutletState } from "@/types";
import { ToggleButton } from "./ToggleButton";
import styles from "./DeviceCard.module.css";

interface Props {
  state: OutletState;
  onToggle: (value: boolean) => void;
}

export function OutletControls({ state, onToggle }: Props) {
  return (
    <>
      <ToggleButton isOn={state.is_on} onToggle={onToggle} />
      <span className={styles.detail}>{state.power_w.toFixed(1)} W</span>
    </>
  );
}
