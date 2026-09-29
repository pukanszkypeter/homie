import styles from "./Tabs.module.css";

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}

/** A pill-style tab switcher, e.g. to split a dialog's content into shorter sections. */
export function Tabs<T extends string>({ value, onChange, options, ariaLabel }: Props<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={styles.tabs}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`${styles.tab} ${option.value === value ? styles.selected : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
