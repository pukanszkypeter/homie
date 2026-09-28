import styles from "./ViewToggle.module.css";

export type CostView = "price" | "unit";

interface Props {
  value: CostView;
  onChange: (view: CostView) => void;
}

const OPTIONS: { value: CostView; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "unit", label: "Unit" },
];

/** Switches a section's grid between showing cost (Ft) and quantity (the item's unit). */
export function ViewToggle({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Show" className={styles.toggle}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`${styles.option} ${option.value === value ? styles.selected : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
