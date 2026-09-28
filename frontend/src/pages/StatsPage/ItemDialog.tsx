import { useEffect, useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchCostItemSeries } from "@/api";
import { Combobox } from "@/components/Combobox/Combobox";
import { AXIS_TICK, TOOLTIP_STYLE } from "@/components/CostBars/chartStyle";
import { Dialog } from "@/components/Dialog/Dialog";
import type { CostItem, CostItemSeries } from "@/types";
import { isCountUnit } from "@/utils/costUnits";
import { formatHuf, formatQuantity } from "@/utils/formatMoney";
import { longMonthName, shortMonthYearOf } from "@/utils/months";
import styles from "./Forms.module.css";
import { MoveButtons } from "./MoveButtons";
import itemStyles from "./ItemDialog.module.css";
import type { CostView } from "./ViewToggle";

interface Props {
  item: CostItem;
  year: number;
  view: CostView; // matches whichever view the item was opened from
  knownUnits: string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onSave: (changes: { name?: string; unit?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ItemDialog({
  item,
  year,
  view,
  knownUnits,
  canMoveUp,
  canMoveDown,
  onMove,
  onSave,
  onDelete,
  onClose,
}: Props) {
  // COUNT_UNIT ("1") isn't a real unit, so it's shown as blank, same as no unit at all.
  const displayedUnit = isCountUnit(item.unit) ? "" : (item.unit ?? "");
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(displayedUnit);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<CostItemSeries | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchCostItemSeries(item.id).then(setSeries, () => setFailed(true));
  }, [item.id]);

  // Mirrors the Price/Unit toggle it was opened from. A count-unit item has no real quantity
  // to chart (it's always a fixed 1), so it always shows cost regardless of which view that
  // was - same fallback as the entry dialog's autofocus.
  const showQuantity = view === "unit" && !isCountUnit(item.unit);
  const points =
    series?.points.filter((p) => (showQuantity ? p.quantity !== null : p.amount_huf !== null)) ??
    [];
  const valueKey = showQuantity ? "quantity" : "amount_huf";
  const format = (value: number) =>
    showQuantity && item.unit ? formatQuantity(value, item.unit) : formatHuf(value);

  const trimmedName = name.trim();
  const trimmedUnit = unit.trim();
  const unitChanged = trimmedUnit !== displayedUnit;
  const changed = trimmedName !== item.name || unitChanged;
  const canSave = trimmedName.length > 0 && changed && !saving;
  // Past months keep whatever quantity they already have; only warn when that would now be
  // read under a different unit label (an item with no history yet has nothing to mislabel).
  const monthsWithQuantity = series?.points.filter((p) => p.quantity !== null).length ?? 0;
  const showUnitWarning = unitChanged && item.unit !== null && monthsWithQuantity > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: trimmedName !== item.name ? trimmedName : undefined,
        unit: unitChanged ? trimmedUnit || null : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={item.name} onClose={onClose}>
      <form className={styles.stack} onSubmit={submit}>
        <div className={styles.group}>
          <label className={styles.field}>
            Name (in every year)
            <input
              className={styles.input}
              value={name}
              maxLength={100}
              aria-label="Item name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.group}>
          <label className={styles.field}>
            Unit
            <Combobox
              value={unit}
              onChange={setUnit}
              options={knownUnits}
              maxLength={20}
              ariaLabel="Unit"
            />
          </label>
          {showUnitWarning && (
            <p className={styles.note}>
              {monthsWithQuantity} already-entered month{monthsWithQuantity === 1 ? "" : "s"} keep
              their quantity as a plain number; it won't be converted to the new unit.
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!canSave}>
            Save
          </button>
        </div>
      </form>
      <MoveButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
      {failed && <p className={styles.error}>Couldn't load the history</p>}
      {series && points.length === 0 && (
        <p>{showQuantity ? "No quantities entered yet." : "No costs entered yet."}</p>
      )}
      {points.length > 0 && (
        <>
          <p className={itemStyles.caption}>
            {showQuantity ? `Quantity (${item.unit})` : "Monthly cost"}
          </p>
          <div className={itemStyles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--color-surface-raised)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  minTickGap={24}
                  padding={{ left: 16, right: 16 }}
                  tickFormatter={shortMonthYearOf}
                />
                <YAxis width={48} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  cursor={false}
                  labelFormatter={(label) => longMonthName(String(label))}
                  formatter={(value) => format(Number(value))}
                />
                <Line
                  dataKey={valueKey}
                  name={showQuantity ? (item.unit ?? "Quantity") : "Cost"}
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-accent)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
      {confirming && (
        <p className={itemStyles.caption}>
          This deletes its {year} months. Other years keep the item and its history.
        </p>
      )}
      <div className={styles.actions}>
        {confirming ? (
          <>
            <button
              type="button"
              className={`${styles.secondary} ${styles.danger}`}
              onClick={onDelete}
            >
              Yes, remove
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className={styles.secondary} onClick={() => setConfirming(true)}>
            Remove from {year}
          </button>
        )}
      </div>
    </Dialog>
  );
}
