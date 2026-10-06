import { useRef, useState } from "react";
import styles from "./DeviceCard.module.css";

// Same round-trip problem as TickSlider's drag-to-send flood, but from repeated clicks instead
// of a drag: computing the next value from `value` (the last-confirmed prop) means several
// quick clicks before the first PATCH resolves all start from the same stale base and collapse
// into a single net +1, not a stack of +1s. Tracking the in-flight value locally and debouncing
// the actual send fixes both - the display jumps instantly per click, only the request is
// delayed and coalesced.
const DEBOUNCE_MS = 800;

interface Props {
  value: number | null;
  min: number;
  max: number;
  unit?: string;
  disabled: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (value: number) => void;
}

export function Stepper({
  value,
  min,
  max,
  unit = "",
  disabled,
  decreaseLabel,
  increaseLabel,
  onChange,
}: Props) {
  const [pending, setPending] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A confirmed value came back (our own debounced write, the poller, another client) - stop
  // overriding it locally. Adjusted during render, like TickSlider, so it takes effect in the
  // same pass instead of causing an extra one.
  const [lastConfirmed, setLastConfirmed] = useState(value);
  if (value !== lastConfirmed) {
    setLastConfirmed(value);
    setPending(null);
  }

  const displayValue = pending ?? value;

  const step = (delta: number) => {
    if (displayValue === null) return;
    const next = Math.min(max, Math.max(min, displayValue + delta));
    setPending(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), DEBOUNCE_MS);
  };

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepperButton}
        disabled={disabled || displayValue === null || displayValue <= min}
        aria-label={decreaseLabel}
        onClick={() => step(-1)}
      >
        {"−"}
      </button>
      <span className={styles.stepperValue}>
        {displayValue !== null ? `${displayValue}${unit}` : "—"}
      </span>
      <button
        type="button"
        className={styles.stepperButton}
        disabled={disabled || displayValue === null || displayValue >= max}
        aria-label={increaseLabel}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
