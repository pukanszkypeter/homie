import { useRef, useState, type CSSProperties } from "react";
import styles from "./DeviceCard.module.css";

const VIEWPORT_MARGIN = 8;
const GAP = 8;

interface Props {
  text: string;
}

// A native `title` tooltip never fires on a touch screen, and this is a tablet-first UI -
// this shows on hover (mouse) and on focus (tap, since a <button> is focusable by default).
// Position is computed in JS on open rather than pinned via CSS: a CSS-only tooltip centered
// on its anchor runs off-screen once the anchor icon sits near a narrow card's edge, and
// there's no way to express "clamp to the viewport" for an arbitrary anchor point in plain
// CSS - this is the same collision-detection problem every tooltip library solves the same way.
export function NoteHint({ text }: Props) {
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const [open, setOpen] = useState(false);

  const show = () => {
    const icon = iconRef.current;
    const tooltip = tooltipRef.current;
    if (!icon || !tooltip) return;
    const iconRect = icon.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const left = Math.min(
      Math.max(iconRect.left + iconRect.width / 2 - width / 2, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    setStyle({ left, top: iconRect.top - tooltip.offsetHeight - GAP });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span className={styles.noteWrap}>
      <button
        ref={iconRef}
        type="button"
        className={styles.noteIcon}
        aria-label={text}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
      >
        {/* U+FE0E forces the text-style glyph, not the platform's colored emoji version -
            otherwise this ignores the CSS color entirely on most systems. */}
        &#9888;&#xfe0e;
      </button>
      <span
        ref={tooltipRef}
        role="tooltip"
        className={styles.noteTooltip}
        style={{ ...style, opacity: open ? 1 : 0 }}
      >
        {text}
      </span>
    </span>
  );
}
