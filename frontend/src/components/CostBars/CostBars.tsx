import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { CostYear } from "@/types";
import { costColorVar } from "@/utils/costColors";
import { formatHuf } from "@/utils/formatMoney";
import { shortMonthName } from "@/utils/months";
import { AXIS_TICK } from "./chartStyle";
import styles from "./CostBars.module.css";

interface Props {
  data: CostYear;
}

/** The default tooltip lists each section's own value; this adds the month's total below
 * them, since that's the number the chart itself doesn't otherwise label anywhere. */
function CostTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.name)} className={styles.tooltipRow}>
          <span className={styles.tooltipSwatch} style={{ background: entry.color }} />
          <span className={styles.tooltipName}>{entry.name}</span>
          <span className={styles.tooltipValue}>{formatHuf(Number(entry.value))}</span>
        </div>
      ))}
      <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
        <span className={styles.tooltipName}>Total</span>
        <span className={styles.tooltipValue}>{formatHuf(total)}</span>
      </div>
    </div>
  );
}

/** Monthly cost, one stacked bar per month - each section is a segment, so the bar's full
 * height is that month's total and each segment is that section's share of it. Segments are
 * separated by a thin surface-colored stroke rather than rounded (any section can end up on
 * top depending on what has data that month, so rounding every segment would round corners
 * that sit mid-stack, not just the outer edges). */
export function CostBars({ data }: Props) {
  const rows = Array.from({ length: 12 }, (_, month) => {
    const row: Record<string, string | number | undefined> = { month: shortMonthName(month) };
    for (const section of data.sections) {
      row[section.name] = section.month_totals[month] ?? undefined;
    }
    return row;
  });

  return (
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 0, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="month"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
          />
          <YAxis
            width={48}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip content={CostTooltip} cursor={{ fill: "rgb(255 255 255 / 6%)" }} />
          <Legend wrapperStyle={{ color: "var(--color-text-muted)", paddingTop: 12 }} />
          {data.sections.map((section) => (
            <Bar
              key={section.id}
              dataKey={section.name}
              stackId="total"
              fill={costColorVar(section.color)}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
