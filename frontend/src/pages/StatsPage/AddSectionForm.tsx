import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import styles from "./Forms.module.css";

interface Props {
  onAdd: (name: string) => Promise<boolean>;
}

export function AddSectionForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    if (await onAdd(name.trim())) setName("");
    setBusy(false);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.input}
        style={{ flex: 1, minWidth: 0 }}
        value={name}
        maxLength={100}
        placeholder="New section (e.g. Utilities)"
        aria-label="New section name"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className={styles.primary} disabled={!canSubmit}>
        <Plus size={22} aria-hidden />
        Add section
      </button>
    </form>
  );
}
