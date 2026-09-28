import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import type { CostCell, CostEntryInput, CostItem } from "@/types";
import { isCountUnit } from "@/utils/costUnits";
import { formatUnitPrice } from "@/utils/formatMoney";
import styles from "./Forms.module.css";
import entryStyles from "./EntryDialog.module.css";
import type { CostView } from "./ViewToggle";

interface Props {
  item: CostItem;
  monthLabel: string;
  cell: CostCell | null;
  view: CostView; // which field was on screen when the cell was tapped, so that one focuses
  onSave: (entry: CostEntryInput) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

export function EntryDialog({ item, monthLabel, cell, view, onSave, onClear, onClose }: Props) {
  const fixedQuantity = isCountUnit(item.unit); // "1" isn't a real unit - nothing to measure
  // Unit view focuses Quantity, except a count item has no real quantity to type into - its
  // field is disabled, so Cost is the only thing worth focusing there either way.
  const focusQuantity = view === "unit" && !fixedQuantity;
  const [amount, setAmount] = useState(cell?.amount_huf != null ? String(cell.amount_huf) : "");
  const [quantity, setQuantity] = useState(
    fixedQuantity ? "1" : cell?.quantity != null ? String(cell.quantity) : "",
  );
  const [note, setNote] = useState(cell?.note ?? "");
  const [busy, setBusy] = useState(false);

  const amountValue = amount.trim() === "" ? null : Number(amount);
  const quantityValue = fixedQuantity ? 1 : quantity.trim() === "" ? null : Number(quantity);
  const validAmount = amountValue === null || Number.isInteger(amountValue);
  const validQuantity = quantityValue === null || quantityValue > 0;
  // A count item's quantity is always 1 regardless of input, so it can't stand in for a
  // price left blank the way a metered item's real, user-entered quantity can.
  const hasSomethingToSave = fixedQuantity
    ? amountValue !== null
    : amountValue !== null || quantityValue !== null;
  const canSave = validAmount && validQuantity && hasSomethingToSave && !busy;

  // Live preview of what the price per unit will be - meaningless for a plain count, and
  // there's nothing to divide once either side is missing.
  const preview =
    !fixedQuantity && item.unit && amountValue !== null && validAmount && quantityValue
      ? amountValue / quantityValue
      : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    run(() =>
      onSave({
        amount_huf: amountValue,
        quantity: quantityValue,
        note: note.trim() || null,
      }),
    );
  };

  return (
    <Dialog title={`${item.name} · ${monthLabel}`} onClose={onClose}>
      <form className={styles.stack} onSubmit={submit}>
        <div className={styles.group}>
          <div className={styles.form}>
            <label className={styles.field}>
              Cost (Ft)
              <input
                className={styles.input}
                type="number"
                step="1"
                value={amount}
                autoFocus={!focusQuantity}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            {item.unit && (
              <label className={styles.field}>
                {fixedQuantity ? "Quantity" : `Quantity (${item.unit})`}
                <input
                  className={styles.input}
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  disabled={fixedQuantity}
                  autoFocus={focusQuantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
            )}
          </div>
          {preview !== null && item.unit && (
            <p className={`${styles.note} ${entryStyles.priceHint}`}>
              {formatUnitPrice(preview, item.unit)}
            </p>
          )}
        </div>
        <label className={styles.field}>
          Note (optional)
          <textarea
            className={styles.textarea}
            value={note}
            maxLength={500}
            placeholder="e.g. tariff changed, one-off repair included…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!canSave}>
            Save
          </button>
          {cell && (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => run(onClear)}
            >
              Clear month
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
