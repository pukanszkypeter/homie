import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import styles from "./Forms.module.css";

interface Props {
  suggested: number;
  onOpen: (year: number) => void;
  onClose: () => void;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function AddYearDialog({ suggested, onOpen, onClose }: Props) {
  const [value, setValue] = useState(String(suggested));
  const year = Number(value);
  const valid = Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onOpen(year);
  };

  return (
    <Dialog title="Add a year" onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          Year
          <input
            className={styles.input}
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step="1"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!valid}>
            Open year
          </button>
        </div>
      </form>
    </Dialog>
  );
}
