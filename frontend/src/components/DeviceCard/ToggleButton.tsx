import styles from "./ToggleButton.module.css";

interface Props {
  isOn: boolean;
  onToggle: (value: boolean) => void;
  // Smaller than the usual 64px tap target - only for a header corner, next to the device
  // name, not the card's main touch target the way it was before this layout.
  compact?: boolean;
}

export function ToggleButton({ isOn, onToggle, compact }: Props) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${isOn ? styles.on : ""} ${compact ? styles.compact : ""}`}
      aria-pressed={isOn}
      onClick={() => onToggle(!isOn)}
    >
      {isOn ? "On" : "Off"}
    </button>
  );
}
