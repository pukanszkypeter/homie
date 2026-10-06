import styles from "./ToggleButton.module.css";

interface Props {
  isOn: boolean;
  onToggle: (value: boolean) => void;
  // Smaller than the usual 64px tap target - for the power row in a device's dialog, where
  // the full size outweighed the controls around it.
  compact?: boolean;
  disabled?: boolean;
}

export function ToggleButton({ isOn, onToggle, compact, disabled }: Props) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${isOn ? styles.on : ""} ${compact ? styles.compact : ""}`}
      aria-pressed={isOn}
      disabled={disabled}
      onClick={() => onToggle(!isOn)}
    >
      {isOn ? "On" : "Off"}
    </button>
  );
}
