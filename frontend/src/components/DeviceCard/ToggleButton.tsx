import styles from "./ToggleButton.module.css";

interface Props {
  isOn: boolean;
  onToggle: (value: boolean) => void;
}

export function ToggleButton({ isOn, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${isOn ? styles.on : ""}`}
      aria-pressed={isOn}
      onClick={() => onToggle(!isOn)}
    >
      {isOn ? "On" : "Off"}
    </button>
  );
}
