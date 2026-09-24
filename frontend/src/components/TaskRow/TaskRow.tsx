import { Circle, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TodoTask } from "@/types";
import { formatDue } from "@/utils/formatDue";
import styles from "./TaskRow.module.css";

interface Props {
  task: TodoTask;
  onComplete: () => void;
  onDelete?: () => void;
}

export function TaskRow({ task, onComplete, onDelete }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const due = task.due_date ? formatDue(task.due_date) : null;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Complete: ${task.title}`}
        onClick={onComplete}
      >
        <Circle size={28} aria-hidden />
      </button>
      <div className={styles.text}>
        <span className={styles.title}>{task.title}</span>
        {(due || task.is_recurring) && (
          <span className={styles.meta}>
            {due && <span className={due.overdue ? styles.overdue : undefined}>{due.text}</span>}
            {task.is_recurring && <Repeat size={14} aria-label="Repeats" />}
          </span>
        )}
      </div>
      {onDelete &&
        (confirmingDelete ? (
          <div className={styles.confirm}>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.textButton} ${styles.danger}`}
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Delete: ${task.title}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={22} aria-hidden />
          </button>
        ))}
    </li>
  );
}
