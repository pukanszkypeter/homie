import { useId, useRef, useState, type CSSProperties } from "react";
import { NoteHint } from "./NoteHint";
import styles from "./DeviceCard.module.css";

// The real device takes ~0.9-1s per command (measured, not assumed) - a debounce shorter
// than that means a mid-drag pause reads as "done" and becomes a real, un-cancelable command
// before you've actually settled. Close to the real round trip, not just "a bit longer."
const DEBOUNCE_MS = 800;
const STEP = 10;
// 0, 10, 20, ... 100 - the slider's own native step grid (step is always relative to min, so
// this has to start at 0, not the real floor - see `zeroMeans` for why 0 itself doesn't always
// get sent as-is). Doubles as the tick marks shown under the slider.
const TICKS = Array.from({ length: 100 / STEP + 1 }, (_, i) => i * STEP);

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
  // Shown above the track - with two+ sliders on one card, "50%" alone doesn't say which
  // control it belongs to.
  label: string;
  // Some scales reserve 0 for something else (brightness's 0 is the separate is_on toggle,
  // not a real brightness) - the native step grid still has to start at 0, so a drag/click to
  // the first tick remaps to this value instead. Omit for a scale where 0 is a real position.
  zeroMeans?: number;
  // Labels for the 0/50/100 ticks below the track - defaults to the plain numbers, but a
  // qualitative scale (cold/neutral/warm) reads better than "0/50/100" when the exact value
  // is already shown on the row above.
  endLabels?: [string, string, string];
  // Computes the thumb/fill color for the current value, in place of the fixed brand accent -
  // e.g. the real Kelvin-derived color for color temperature. Omit to keep the plain accent.
  colorFor?: (value: number) => string;
  // A short caveat shown next to the value, via a tappable icon (not a native `title` -
  // that never fires on a touch screen, and this is a tablet-first UI) - e.g. a control
  // that's real and writable but has no physical effect on this particular fixture.
  note?: string;
  // Shown in place of the number while the user isn't dragging - for a slider that stands
  // for several devices that don't currently agree ("Mixed").
  valueLabel?: string;
}

export function TickSlider({
  value,
  onChange,
  disabled,
  ariaLabel,
  label,
  zeroMeans,
  endLabels,
  colorFor,
  note,
  valueLabel,
}: Props) {
  const ticksId = useId();

  // A range input fires onChange on every tick while dragging, not just on release - sending
  // one request per tick flooded a real device with overlapping commands on the same LAN
  // socket. Track the dragged value locally so the slider moves instantly, and only send it
  // once movement settles - native `step` (below) already keeps every value on a clean
  // multiple of 10, so there's nothing left to round here, just to debounce.
  const [pending, setPending] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A confirmed value came back (our own debounced write, the poller, another client) - stop
  // overriding it locally. Adjusted during render (not an effect) so it takes effect in the
  // same pass instead of causing an extra one.
  const [lastConfirmed, setLastConfirmed] = useState(value);
  if (value !== lastConfirmed) {
    setLastConfirmed(value);
    setPending(null);
  }

  const displayValue = pending ?? value;

  const handleChange = (rawValue: number) => {
    const next = rawValue === 0 && zeroMeans !== undefined ? zeroMeans : rawValue;
    setPending(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), DEBOUNCE_MS);
  };

  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderLabel}>
        <span>
          {label}
          {note && <NoteHint text={note} />}
        </span>
        <span>{pending === null && valueLabel ? valueLabel : `${displayValue}%`}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={100}
        step={STEP}
        list={ticksId}
        value={displayValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => handleChange(Number(e.target.value))}
        style={
          {
            "--fill": `${displayValue}%`,
            ...(colorFor && { "--slider-accent": colorFor(displayValue) }),
          } as CSSProperties
        }
      />
      <datalist id={ticksId}>
        {TICKS.map((tick) => (
          <option key={tick} value={tick} />
        ))}
      </datalist>
      <div className={styles.sliderTicks} aria-hidden>
        {TICKS.map((tick) => (
          <span key={tick} className={styles.tick} />
        ))}
      </div>
      <div className={styles.sliderLabels} aria-hidden>
        <span>{endLabels?.[0] ?? zeroMeans ?? 0}</span>
        <span>{endLabels?.[1] ?? 50}</span>
        <span>{endLabels?.[2] ?? 100}</span>
      </div>
    </div>
  );
}
