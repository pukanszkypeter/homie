import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./Combobox.module.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel: string;
  placeholder?: string;
  maxLength?: number;
  style?: CSSProperties;
}

/** A text field with suggestions, styled to match our own inputs everywhere - unlike the
 * browser's native <datalist> popup, whose padding, width and look we can't control, and
 * which Safari/iOS doesn't render at all. */
export function Combobox({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  maxLength,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((option) => option.toLowerCase().includes(query))
    : options;
  const showList = open && filtered.length > 0;

  const commit = (option: string) => {
    onChange(option);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      commit(filtered[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.wrapper}
      style={style}
      // A click on an option fires this blur first; only close if focus left the whole widget.
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <input
        className={styles.input}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={listboxId} role="listbox" className={styles.list}>
          {filtered.map((option, index) => (
            <li key={option} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={`${styles.option} ${index === highlight ? styles.highlighted : ""}`}
                onMouseDown={(event) => event.preventDefault()} // keep focus so blur doesn't beat the click
                onClick={() => commit(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
