import { Plus } from "lucide-react";
import { useState } from "react";
import { ChipGroup } from "@/components/ChipGroup/ChipGroup";
import { CostBars } from "@/components/CostBars/CostBars";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import {
  addCostItem,
  addCostSection,
  copyCostStructure,
  deleteCostEntry,
  deleteCostItem,
  deleteCostSection,
  deleteCostYear,
  moveCostItem,
  moveCostSection,
  saveCostEntry,
  updateCostItem,
  updateCostSection,
} from "@/api";
import { useCostYear } from "@/hooks/useCostYear";
import type { CostColor, CostEntryInput, CostItem, CostSectionYear } from "@/types";
import { COUNT_UNIT } from "@/utils/costUnits";
import { formatHuf } from "@/utils/formatMoney";
import { longMonthName, monthKey } from "@/utils/months";
import { AddSectionForm } from "./AddSectionForm";
import { AddYearDialog } from "./AddYearDialog";
import { DeleteYear } from "./DeleteYear";
import forms from "./Forms.module.css";
import { EntryDialog } from "./EntryDialog";
import { ItemDialog } from "./ItemDialog";
import { SectionDialog } from "./SectionDialog";
import { SectionTable } from "./SectionTable";
import styles from "./StatsPage.module.css";
import type { CostView } from "./ViewToggle";

interface EditingCell {
  item: CostItem;
  monthIndex: number;
  view: CostView;
}

export function StatsPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, knownYears, error, reload } = useCostYear(year);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [openItem, setOpenItem] = useState<CostItem | null>(null);
  // Which view (price/unit) the item was opened from, so its history chart matches it.
  const [openItemView, setOpenItemView] = useState<CostView>("price");
  const [editingSection, setEditingSection] = useState<CostSectionYear | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingYear, setAddingYear] = useState(false);
  // Years the user opened but hasn't put anything in yet; they only exist once they have sections.
  const [openedYears, setOpenedYears] = useState<number[]>([]);

  const years = [...new Set([thisYear, year, ...openedYears, ...knownYears])].sort((a, b) => b - a);
  // The year whose sections and items are offered as a starting point for an empty year.
  const copySource = knownYears.find((y) => y < year) ?? knownYears.at(-1);

  // Run an edit, refresh, and report a failure without closing whatever the user is typing in.
  const mutate = async (action: () => Promise<unknown>): Promise<boolean> => {
    setActionError(null);
    try {
      await action();
      await reload();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  // After deleting a year, land on the nearest one that is left.
  const removeYear = async (): Promise<boolean> => {
    const remaining = years.filter((y) => y !== year && knownYears.includes(y));
    const next = remaining.find((y) => y < year) ?? remaining.at(-1) ?? thisYear;
    if (!(await mutate(() => deleteCostYear(year)))) return false;
    setOpenedYears((current) => current.filter((y) => y !== year));
    setYear(next);
    return true;
  };

  const closeAfter = (close: () => void) => async (action: () => Promise<unknown>) => {
    if (await mutate(action)) close();
  };

  const editedCell =
    editing && data
      ? (data.sections.flatMap((s) => s.items).find((i) => i.id === editing.item.id)?.months[
          editing.monthIndex
        ] ?? null)
      : null;
  const editedMonth = editing ? monthKey(year, editing.monthIndex) : "";

  // The dialogs show the live position, so they stay right after each move.
  const sections = data?.sections ?? [];
  const sectionIndex = editingSection ? sections.findIndex((s) => s.id === editingSection.id) : -1;
  const itemSection = openItem
    ? sections.find((s) => s.items.some((i) => i.id === openItem.id))
    : undefined;
  const itemIndex = itemSection?.items.findIndex((i) => i.id === openItem?.id) ?? -1;

  const hasAmounts = data?.month_totals.some((total) => total !== null) ?? false;
  // Offered as suggestions when setting a unit, so "kWh" and "m³" stay spelled the same way
  // across items instead of drifting into near-duplicates. COUNT_UNIT isn't a real unit, so
  // it's never offered as one.
  const knownUnits = [
    ...new Set(
      sections
        .flatMap((s) => s.items)
        .map((i) => i.unit)
        .filter((u): u is string => !!u && u !== COUNT_UNIT),
    ),
  ].sort();

  return (
    <>
      <PageHeader title="Costs">
        {actionError && <span className={styles.error}>{actionError}</span>}
      </PageHeader>
      <div className={styles.content}>
        <div className={styles.years}>
          <ChipGroup
            label="Year"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
            selected={String(year)}
            onSelect={(value) => setYear(Number(value))}
          />
          <button type="button" className={forms.secondary} onClick={() => setAddingYear(true)}>
            <Plus size={20} aria-hidden />
            Year
          </button>
        </div>
        {!data ? (
          <p className={styles.message}>
            {error ? "Costs not available right now" : "Loading costs…"}
          </p>
        ) : (
          <>
            {data.sections.length === 0 && (
              <div className={styles.empty}>
                <p>{year} has no sections yet.</p>
                {copySource !== undefined && copySource !== year && (
                  <button
                    type="button"
                    className={forms.primary}
                    onClick={() => mutate(() => copyCostStructure(year, copySource))}
                  >
                    Copy sections and items from {copySource}
                  </button>
                )}
              </div>
            )}
            {hasAmounts && (
              <>
                <p className={styles.total}>
                  {year} total <strong>{formatHuf(data.total_huf)}</strong>
                </p>
                <CostBars data={data} />
              </>
            )}
            {data.sections.map((section) => (
              <SectionTable
                key={section.id}
                section={section}
                year={year}
                onEditCell={(item, monthIndex, view) => setEditing({ item, monthIndex, view })}
                onOpenItem={(item, view) => {
                  setOpenItem(item);
                  setOpenItemView(view);
                }}
                knownUnits={knownUnits}
                onEdit={setEditingSection}
                onRemove={(sectionId) => mutate(() => deleteCostSection(year, sectionId))}
                onAddItem={(sectionId, name, unit) =>
                  mutate(() => addCostItem(year, sectionId, name, unit))
                }
              />
            ))}
            <AddSectionForm onAdd={(name) => mutate(() => addCostSection(year, name))} />
            {data.sections.length > 0 && <DeleteYear data={data} onDelete={removeYear} />}
          </>
        )}
      </div>
      {editing && (
        <EntryDialog
          key={`${editing.item.id}-${editedMonth}`}
          item={editing.item}
          monthLabel={longMonthName(editedMonth)}
          cell={editedCell}
          view={editing.view}
          onSave={(entry: CostEntryInput) =>
            closeAfter(() => setEditing(null))(() =>
              saveCostEntry(editing.item.id, editedMonth, entry),
            )
          }
          onClear={() =>
            closeAfter(() => setEditing(null))(() => deleteCostEntry(editing.item.id, editedMonth))
          }
          onClose={() => setEditing(null)}
        />
      )}
      {editingSection && (
        <SectionDialog
          section={editingSection}
          canMoveUp={sectionIndex > 0}
          canMoveDown={sectionIndex >= 0 && sectionIndex < sections.length - 1}
          onMove={(direction) => mutate(() => moveCostSection(year, editingSection.id, direction))}
          onSave={(changes: { name?: string; color?: CostColor }) =>
            closeAfter(() => setEditingSection(null))(() =>
              updateCostSection(editingSection.id, changes),
            )
          }
          onClose={() => setEditingSection(null)}
        />
      )}
      {addingYear && (
        <AddYearDialog
          suggested={Math.max(thisYear, ...years) + 1}
          onOpen={(opened) => {
            setOpenedYears((current) => [...current, opened]);
            setYear(opened);
            setAddingYear(false);
          }}
          onClose={() => setAddingYear(false)}
        />
      )}
      {openItem && (
        <ItemDialog
          item={openItem}
          year={year}
          view={openItemView}
          knownUnits={knownUnits}
          canMoveUp={itemIndex > 0}
          canMoveDown={itemSection !== undefined && itemIndex < itemSection.items.length - 1}
          onMove={(direction) => mutate(() => moveCostItem(year, openItem.id, direction))}
          onSave={(changes: { name?: string; unit?: string | null }) =>
            closeAfter(() => setOpenItem(null))(() => updateCostItem(openItem.id, changes))
          }
          onDelete={() =>
            closeAfter(() => setOpenItem(null))(() => deleteCostItem(year, openItem.id))
          }
          onClose={() => setOpenItem(null)}
        />
      )}
    </>
  );
}
