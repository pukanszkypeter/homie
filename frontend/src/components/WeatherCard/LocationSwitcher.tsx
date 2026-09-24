import styles from "./LocationSwitcher.module.css";

interface Props {
  names: string[];
  selected: string;
  onSelect: (name: string) => void;
}

export function LocationSwitcher({ names, selected, onSelect }: Props) {
  return (
    <div role="group" aria-label="Location" className={styles.list}>
      {names.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={name === selected}
          className={`${styles.chip} ${name === selected ? styles.selected : ""}`}
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
