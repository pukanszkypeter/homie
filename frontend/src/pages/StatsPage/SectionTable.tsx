import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CostCell, CostItem, CostItemYear, CostSectionYear } from "@/types";
import { isCountUnit } from "@/utils/costUnits";
import { formatAmount, formatQuantityValue } from "@/utils/formatMoney";
import { shortMonthName } from "@/utils/months";
import { AddItemForm } from "./AddItemForm";
import forms from "./Forms.module.css";
import styles from "./SectionTable.module.css";
import { ViewToggle, type CostView } from "./ViewToggle";

interface Props {
  section: CostSectionYear;
  year: number;
  onEditCell: (item: CostItem, monthIndex: number, view: CostView) => void;
  onOpenItem: (item: CostItem) => void;
  knownUnits: string[];
  onAddItem: (sectionId: number, name: string, unit: string | null) => Promise<boolean>;
  onEdit: (section: CostSectionYear) => void;
  onRemove: (sectionId: number) => Promise<boolean>;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

// "–" covers every "nothing to show" case in both views: no entry that month, an entry
// with a price but no quantity, and (in price view) an entry with a quantity but no price
// yet (a metered item's usage logged ahead of the bill). A count-unit item reads 1 only for
// a month it actually has an entry in - e.g. a subscription canceled mid-year should read
// "–" for the months after that, not a phantom 1.
function cellText(view: CostView, item: CostItemYear, cell: CostCell | null): string {
  if (view === "price") return cell?.amount_huf != null ? formatAmount(cell.amount_huf) : "–";
  if (isCountUnit(item.unit)) return cell != null ? "1" : "–";
  return item.unit && cell?.quantity != null ? formatQuantityValue(cell.quantity) : "–";
}

// A row total across a single item's own months is meaningful (one unit, e.g. m³ of water
// used this year). Summing across different items in the footer isn't - see footerText.
// item.total_huf is 0 both when the months genuinely net to 0 and when there's no data at
// all (the backend can't tell those apart in one int), so "any price this year" is checked
// here instead, from the months themselves, which do keep that distinction.
function itemTotalText(view: CostView, item: CostItemYear): string {
  if (view === "price") {
    const hasAnyPrice = item.months.some((c) => c?.amount_huf != null);
    return hasAnyPrice ? formatAmount(item.total_huf) : "–";
  }
  if (isCountUnit(item.unit)) {
    const enteredMonths = item.months.filter((c) => c != null).length;
    return enteredMonths > 0 ? formatQuantityValue(enteredMonths) : "–";
  }
  const quantities = item.months
    .map((c) => c?.quantity ?? null)
    .filter((q): q is number => q != null);
  return quantities.length > 0 ? formatQuantityValue(quantities.reduce((a, b) => a + b, 0)) : "–";
}

// The footer sums cost across every item in the section, which is fine in Ft - every item's
// amount is the same currency. Quantity isn't: items can have different (or no) real units
// (kWh, m³, a plain count), so a section-wide quantity total is never a meaningful number,
// unlike each item's own row total (itemTotalText), which stays within that one item's unit.
function footerText(view: CostView, priceValue: number | null): string {
  if (view === "unit") return "–";
  return priceValue === null ? "–" : formatAmount(priceValue);
}

export function SectionTable({
  section,
  year,
  onEditCell,
  onOpenItem,
  knownUnits,
  onAddItem,
  onEdit,
  onRemove,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [view, setView] = useState<CostView>("price");

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{section.name}</h2>
        <div className={styles.tools}>
          <ViewToggle value={view} onChange={setView} />
          <button
            type="button"
            className={styles.tool}
            aria-label={`Edit ${section.name}`}
            onClick={() => onEdit(section)}
          >
            <Pencil size={20} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label={`Remove ${section.name} from ${year}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={20} aria-hidden />
          </button>
        </div>
      </div>
      {confirming && (
        <div className={styles.confirm}>
          <p>
            Remove {section.name}, its items and their {year} months? Other years keep it.
          </p>
          <div className={forms.actions}>
            <button
              type="button"
              className={`${forms.secondary} ${forms.danger}`}
              onClick={() => onRemove(section.id)}
            >
              Yes, remove
            </button>
            <button type="button" className={forms.secondary} onClick={() => setConfirming(false)}>
              Keep
            </button>
          </div>
        </div>
      )}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.name} scope="col">
                {view === "price" ? "Ft" : "Qty"}
              </th>
              {MONTHS.map((m) => (
                <th key={m} scope="col" className={m === 11 ? styles.beforeTotal : undefined}>
                  {shortMonthName(m)}
                </th>
              ))}
              <th scope="col" className={styles.totalCol}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item) => (
              <tr key={item.id}>
                <th className={styles.name} scope="row">
                  <div className={styles.nameRow}>
                    <button
                      type="button"
                      className={styles.itemButton}
                      onClick={() => onOpenItem(item)}
                    >
                      {item.name}
                    </button>
                    {view === "unit" && item.unit && (
                      <span className={styles.unitTag}>{item.unit}</span>
                    )}
                  </div>
                </th>
                {MONTHS.map((m) => {
                  const cell = item.months[m];
                  return (
                    <td key={m} className={m === 11 ? styles.beforeTotal : undefined}>
                      <button
                        type="button"
                        className={`${styles.cell} ${cell?.amount_huf != null && cell.amount_huf < 0 ? styles.credit : ""}`}
                        aria-label={`${item.name}, ${shortMonthName(m)}${cell?.note ? " (has a note)" : ""}`}
                        title={cell?.note ?? undefined}
                        onClick={() => onEditCell(item, m, view)}
                      >
                        {cellText(view, item, cell)}
                        {cell?.note && <span className={styles.noteDot} aria-hidden />}
                      </button>
                    </td>
                  );
                })}
                <td className={`${styles.sum} ${styles.totalCol}`}>{itemTotalText(view, item)}</td>
              </tr>
            ))}
          </tbody>
          {section.items.length > 0 && (
            <tfoot>
              <tr>
                <th className={styles.name} scope="row">
                  Total
                </th>
                {section.month_totals.map((value, m) => (
                  <td key={m} className={`${styles.sum} ${m === 11 ? styles.beforeTotal : ""}`}>
                    {footerText(view, value)}
                  </td>
                ))}
                <td className={`${styles.sum} ${styles.totalCol}`}>
                  {/* section.total_huf is 0 both for "genuinely nets to 0" and "no data all
                  year" - month_totals keeps that distinction, so it decides here instead. */}
                  {footerText(
                    view,
                    section.month_totals.some((v) => v !== null) ? section.total_huf : null,
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <AddItemForm
        knownUnits={knownUnits}
        onAdd={(name, unit) => onAddItem(section.id, name, unit)}
      />
    </section>
  );
}
