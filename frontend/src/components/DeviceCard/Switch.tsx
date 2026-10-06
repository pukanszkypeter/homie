import styles from "./DeviceCard.module.css";

interface Props {
  // Read by screen readers - the visible label is a sibling in the row, not part of this.
  label: string;
  isOn: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

// A sliding switch, distinct on purpose from ToggleButton - that one is a device's power
// control, while this is for a secondary setting (auto clean, mute) that shouldn't visually
// compete with it.
export function Switch({ label, isOn, onToggle, disabled }: Props) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${isOn ? styles.switchOn : ""}`}
      role="switch"
      aria-label={label}
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => onToggle(!isOn)}
    >
      <span className={styles.switchThumb} />
    </button>
  );
}
