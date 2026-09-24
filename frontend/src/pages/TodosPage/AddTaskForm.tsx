import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import styles from "./AddTaskForm.module.css";

interface Props {
  onAdd: (title: string) => Promise<boolean>;
}

export function AddTaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = title.trim().length > 0 && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    const added = await onAdd(title.trim());
    if (added) setTitle("");
    setBusy(false);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.input}
        value={title}
        maxLength={255}
        placeholder="Add a task"
        aria-label="New task"
        enterKeyHint="done"
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit" className={styles.button} disabled={!canSubmit}>
        <Plus size={22} aria-hidden />
        Add
      </button>
    </form>
  );
}
