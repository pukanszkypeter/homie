import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import type { CostColor, CostSectionYear } from "@/types";
import { ColorPicker } from "./ColorPicker";
import styles from "./Forms.module.css";
import { MoveButtons } from "./MoveButtons";

interface Props {
  section: CostSectionYear;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onSave: (changes: { name?: string; color?: CostColor }) => Promise<void>;
  onClose: () => void;
}

export function SectionDialog({ section, canMoveUp, canMoveDown, onMove, onSave, onClose }: Props) {
  const [name, setName] = useState(section.name);
  const [color, setColor] = useState<CostColor>(section.color);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== section.name || color !== section.color;
  const canSave = trimmed.length > 0 && changed && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      await onSave({
        name: trimmed !== section.name ? trimmed : undefined,
        color: color !== section.color ? color : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Edit section" onClose={onClose}>
      <form className={styles.stack} onSubmit={submit}>
        <div className={styles.group}>
          <label className={styles.field}>
            Name
            <input
              className={styles.input}
              value={name}
              maxLength={100}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className={styles.note}>Renaming applies to every year that lists this section.</p>
        </div>
        <div className={styles.group}>
          <span className={styles.label}>Chart color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className={styles.group}>
          <span className={styles.label}>Position</span>
          <MoveButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!canSave}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
