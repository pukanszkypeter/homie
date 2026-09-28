import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { CostYear } from "@/types";
import forms from "./Forms.module.css";
import styles from "./DeleteYear.module.css";

interface Props {
  data: CostYear;
  onDelete: () => Promise<boolean>;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Deleting a year is permanent, so the confirmation says exactly what will be lost. */
export function DeleteYear({ data, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  const items = data.sections.flatMap((s) => s.items);
  const months = items.reduce((sum, item) => sum + item.months.filter(Boolean).length, 0);

  if (!confirming) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setConfirming(true)}>
        <Trash2 size={18} aria-hidden />
        Delete {data.year}
      </button>
    );
  }

  return (
    <div className={styles.confirm}>
      <p>
        Delete {data.year}? This removes {plural(data.sections.length, "section")},{" "}
        {plural(items.length, "item")} and {plural(months, "entered month")}. Other years are not
        touched. This can't be undone.
      </p>
      <div className={forms.actions}>
        <button
          type="button"
          className={`${forms.secondary} ${forms.danger}`}
          onClick={() => onDelete()}
        >
          Yes, delete {data.year}
        </button>
        <button type="button" className={forms.secondary} onClick={() => setConfirming(false)}>
          Keep
        </button>
      </div>
    </div>
  );
}
