import styles from "./ViewToggle.module.css";

export type CostView = "price" | "unit";

interface Props {
  value: CostView;
  onChange: (view: CostView) => void;
  // A count-unit item has no real quantity to switch to - Unit stays visible but unusable
  // rather than disappearing, so it's clear why it's missing rather than just absent.
  disableUnit?: boolean;
}

const OPTIONS: { value: CostView; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "unit", label: "Unit" },
];

/** Switches between showing cost (Ft) and quantity (the item's unit). */
export function ViewToggle({ value, onChange, disableUnit }: Props) {
  return (
    <div role="radiogroup" aria-label="Show" className={styles.toggle}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={option.value === "unit" && disableUnit}
          className={`${styles.option} ${option.value === value ? styles.selected : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
