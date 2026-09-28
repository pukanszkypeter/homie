import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Combobox } from "@/components/Combobox/Combobox";
import styles from "./Forms.module.css";

interface Props {
  knownUnits: string[];
  onAdd: (name: string, unit: string | null) => Promise<boolean>;
}

export function AddItemForm({ knownUnits, onAdd }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    // Blank means no real unit - the backend stores that as "1" (see COUNT_UNIT).
    if (await onAdd(name.trim(), unit.trim() || null)) {
      setName("");
      setUnit("");
    }
    setBusy(false);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.input}
        style={{ flex: 2, minWidth: 0 }}
        value={name}
        maxLength={100}
        placeholder="New item"
        aria-label="New item name"
        onChange={(e) => setName(e.target.value)}
      />
      <Combobox
        value={unit}
        onChange={setUnit}
        options={knownUnits}
        maxLength={20}
        placeholder="Unit (kWh, m³)"
        ariaLabel="Unit, optional - leave blank if this cost has no real unit"
        style={{ flex: 1, minWidth: 0 }}
      />
      <button type="submit" className={styles.primary} disabled={!canSubmit}>
        <Plus size={22} aria-hidden />
        Add
      </button>
    </form>
  );
}
