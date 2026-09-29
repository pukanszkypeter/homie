import type { ReactNode } from "react";
import styles from "./DeviceCard.module.css";

interface Props {
  icon: ReactNode;
  label: ReactNode;
  value: string;
}

export function StatItem({ icon, label, value }: Props) {
  return (
    <div className={styles.statItem}>
      <div className={styles.statIcon} aria-hidden>
        {icon}
      </div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}
