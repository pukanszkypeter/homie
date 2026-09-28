import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./Forms.module.css";

interface Props {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}

/** Reordering with buttons rather than dragging, which is fiddly on a touch screen. */
export function MoveButtons({ canMoveUp, canMoveDown, onMove }: Props) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.secondary}
        disabled={!canMoveUp}
        onClick={() => onMove("up")}
      >
        <ChevronUp size={20} aria-hidden />
        Move up
      </button>
      <button
        type="button"
        className={styles.secondary}
        disabled={!canMoveDown}
        onClick={() => onMove("down")}
      >
        <ChevronDown size={20} aria-hidden />
        Move down
      </button>
    </div>
  );
}
