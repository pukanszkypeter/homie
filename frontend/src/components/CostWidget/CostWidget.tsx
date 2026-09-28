import { Link } from "react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useCostSummary } from "@/hooks/useCostSummary";
import { formatHuf } from "@/utils/formatMoney";
import { longMonthName, shortMonthOf } from "@/utils/months";
import styles from "./CostWidget.module.css";

export function CostWidget() {
  const { data, failed } = useCostSummary();

  if (!data) {
    return (
      <p className={styles.message}>{failed ? "Costs not available right now" : "Loading…"}</p>
    );
  }
  if (!data.latest) {
    return (
      <p className={styles.message}>
        No costs yet. <Link to="/stats">Add your first month</Link>
      </p>
    );
  }

  const { latest, previous } = data;
  const change = previous ? latest.total_huf - previous.total_huf : null;

  return (
    <div className={styles.widget}>
      <p className={styles.month}>{longMonthName(latest.month)}</p>
      <p className={styles.total}>{formatHuf(latest.total_huf)}</p>
      {change !== null && previous && (
        <p className={`${styles.change} ${change > 0 ? styles.up : styles.down}`}>
          {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {formatHuf(Math.abs(change))} vs{" "}
          {shortMonthOf(previous.month)}
        </p>
      )}
      <div className={styles.spark} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.trend}>
            <Area
              dataKey="total_huf"
              type="monotone"
              stroke="var(--color-accent)"
              fill="var(--color-accent)"
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
