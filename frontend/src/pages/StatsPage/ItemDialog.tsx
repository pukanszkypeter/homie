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
import { Tabs } from "@/components/Tabs/Tabs";
import type { CostCell, CostItem, CostItemSeries } from "@/types";
import { isCountUnit } from "@/utils/costUnits";
import { formatHuf, formatQuantity } from "@/utils/formatMoney";
import { longMonthName, shortMonthYearOf } from "@/utils/months";
import styles from "./Forms.module.css";
import { MoveButtons } from "./MoveButtons";
import itemStyles from "./ItemDialog.module.css";
import { ViewToggle, type CostView } from "./ViewToggle";

interface Props {
  item: CostItem;
  year: number;
  months: (CostCell | null)[]; // this year's existing entries, for the fill feature below
  knownUnits: string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onSave: (changes: { name?: string; unit?: string | null }) => Promise<void>;
  onFillYear: (amounts: number[]) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

// Splits a whole-forint total into 12 whole-forint monthly amounts that add back up to
// exactly the total - a plain division would drop or gain a forint or two to rounding.
function scatterAcrossMonths(total: number, count: number): number[] {
  const base = Math.trunc(total / count);
  const remainder = total - base * count;
  const step = remainder > 0 ? 1 : -1;
  return Array.from({ length: count }, (_, i) => base + (i < Math.abs(remainder) ? step : 0));
}

export function ItemDialog({
  item,
  year,
  months,
  knownUnits,
  canMoveUp,
  canMoveDown,
  onMove,
  onSave,
  onFillYear,
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
  const [tab, setTab] = useState<"details" | "fill" | "history">("details");
  const [historyView, setHistoryView] = useState<CostView>("price");
  const [fillAmount, setFillAmount] = useState("");
  const [fillMode, setFillMode] = useState<"scatter" | "fill" | null>(null); // pending confirm
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    fetchCostItemSeries(item.id).then(setSeries, () => setFailed(true));
  }, [item.id]);

  // Only this year, not the item's whole history - a count-unit item has no real quantity to
  // chart (it's always a fixed 1), so Unit stays disabled and this never turns true for one.
  const yearPoints = series?.points.filter((p) => p.month.startsWith(`${year}-`)) ?? [];
  const showQuantity = historyView === "unit" && !isCountUnit(item.unit);
  const rawPoints = yearPoints.filter((p) =>
    showQuantity ? p.quantity !== null : p.amount_huf !== null,
  );
  // A pure-credit item (every entry at or below zero, e.g. a feed-in credit) still stores and
  // displays its real, negative amount everywhere else - the table, entry dialogs, etc. But
  // charting it as literally negative reads as "cost falling", when what's actually growing is
  // the credit. Flip the sign for this chart only, for an item that's consistently a credit.
  const isCredit =
    !showQuantity &&
    rawPoints.length > 0 &&
    rawPoints.every((p) => (p.amount_huf as number) <= 0) &&
    rawPoints.some((p) => (p.amount_huf as number) < 0);
  const points = rawPoints.map((p) => ({
    ...p,
    value: ((showQuantity ? p.quantity : p.amount_huf) as number) * (isCredit ? -1 : 1),
  }));
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

  const fillAmountValue = fillAmount.trim() === "" ? null : Number(fillAmount);
  const validFillAmount = fillAmountValue !== null && Number.isInteger(fillAmountValue);
  const existingCount = months.filter((c) => c?.amount_huf != null).length;

  const runFill = async (mode: "scatter" | "fill") => {
    if (fillAmountValue === null) return;
    const amounts =
      mode === "scatter"
        ? scatterAcrossMonths(fillAmountValue, 12)
        : Array<number>(12).fill(fillAmountValue);
    setFilling(true);
    try {
      if (await onFillYear(amounts)) {
        setFillAmount("");
        setFillMode(null);
      }
    } finally {
      setFilling(false);
    }
  };

  // Filling in already-priced months is easy to do by accident, so confirm first - unless
  // there's nothing to overwrite.
  const requestFill = (mode: "scatter" | "fill") => {
    if (existingCount > 0) setFillMode(mode);
    else runFill(mode);
  };

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
      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Item section"
        options={[
          { value: "details", label: "Details" },
          { value: "fill", label: "Fill" },
          { value: "history", label: "History" },
        ]}
      />
      {tab === "details" && (
        <form className={itemStyles.detailsForm} onSubmit={submit}>
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
          <div className={styles.group}>
            <span className={styles.label}>Position</span>
            <MoveButtons canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
          </div>
          <div className={itemStyles.dialogActions}>
            {confirming ? (
              <>
                <p className={itemStyles.caption}>
                  This deletes its {year} months. Other years keep the item and its history.
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.secondary} ${styles.danger}`}
                    onClick={onDelete}
                  >
                    Yes, remove
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setConfirming(false)}
                  >
                    Keep
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={!canSave}>
                  Save
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setConfirming(true)}
                >
                  Remove from {year}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
      {tab === "fill" && (
        <div className={itemStyles.fillGroup}>
          <label className={styles.field}>
            Fill {year} (Ft)
            <input
              className={styles.input}
              type="number"
              step="1"
              placeholder="e.g. 60000"
              autoFocus
              value={fillAmount}
              onChange={(e) => setFillAmount(e.target.value)}
            />
          </label>
          {fillMode ? (
            <>
              <p className={styles.note}>
                {existingCount} of {year}'s months already {existingCount === 1 ? "has" : "have"} a
                cost - this overwrites {existingCount === 1 ? "it" : "them"}.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.secondary} ${styles.danger}`}
                  disabled={filling}
                  onClick={() => runFill(fillMode)}
                >
                  Yes, overwrite
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={filling}
                  onClick={() => setFillMode(null)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={!validFillAmount || filling}
                onClick={() => requestFill("scatter")}
              >
                Scatter across months
              </button>
              <button
                type="button"
                className={styles.secondary}
                disabled={!validFillAmount || filling}
                onClick={() => requestFill("fill")}
              >
                Fill every month
              </button>
            </div>
          )}
        </div>
      )}
      {tab === "history" && (
        <>
          <div className={itemStyles.historyHeader}>
            <ViewToggle
              value={historyView}
              onChange={setHistoryView}
              disableUnit={isCountUnit(item.unit)}
            />
          </div>
          {failed && <p className={styles.error}>Couldn't load the history</p>}
          {series && points.length === 0 && (
            <p>{showQuantity ? "No quantities entered yet." : "No costs entered yet."}</p>
          )}
          {points.length > 0 && (
            <>
              <p className={itemStyles.caption}>
                {showQuantity
                  ? `Monthly quantity (${item.unit})`
                  : isCredit
                    ? "Monthly credit"
                    : "Monthly cost"}
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
                      dataKey="value"
                      name={showQuantity ? (item.unit ?? "Quantity") : isCredit ? "Credit" : "Cost"}
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
        </>
      )}
    </Dialog>
  );
}
