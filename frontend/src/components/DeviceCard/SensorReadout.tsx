import type { SensorState } from "@/types";
import styles from "./DeviceCard.module.css";

interface Props {
  state: SensorState;
}

export function SensorReadout({ state }: Props) {
  return (
    <span className={styles.reading}>
      {state.value.toFixed(1)}
      {state.unit}
    </span>
  );
}
