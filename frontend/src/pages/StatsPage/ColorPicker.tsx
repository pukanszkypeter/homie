import { Check } from "lucide-react";
import type { CostColor } from "@/types";
import { COST_COLORS, costColorVar } from "@/utils/costColors";
import styles from "./ColorPicker.module.css";

interface Props {
  value: CostColor;
  onChange: (color: CostColor) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Chart color" className={styles.picker}>
      {COST_COLORS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={key === value}
          aria-label={label}
          className={`${styles.swatch} ${key === value ? styles.selected : ""}`}
          style={{ background: costColorVar(key) }}
          onClick={() => onChange(key)}
        >
          {key === value && <Check size={24} aria-hidden />}
        </button>
      ))}
    </div>
  );
}
