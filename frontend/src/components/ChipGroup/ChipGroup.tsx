import type { LucideIcon } from "lucide-react";
import styles from "./ChipGroup.module.css";

export interface ChipOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface Props {
  label: string;
  options: ChipOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export function ChipGroup({ label, options, selected, onSelect }: Props) {
  return (
    <div role="group" aria-label={label} className={styles.list}>
      {options.map(({ value, label: text, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={value === selected}
          className={`${styles.chip} ${value === selected ? styles.selected : ""}`}
          onClick={() => onSelect(value)}
        >
          {Icon && <Icon size={18} aria-hidden />}
          {text}
        </button>
      ))}
    </div>
  );
}
