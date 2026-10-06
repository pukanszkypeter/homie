import type { ReactNode } from "react";
import styles from "./DeviceCard.module.css";

export function ControlGroup({ children }: { children: ReactNode }) {
  return <div className={styles.controlGroup}>{children}</div>;
}

interface RowProps {
  label: string;
  // The setting's control, or a plain string for a read-only value.
  children: ReactNode;
}

export function ControlRow({ label, children }: RowProps) {
  return (
    <div className={styles.controlRow}>
      <span className={styles.controlLabel}>{label}</span>
      {typeof children === "string" ? (
        <span className={styles.controlValue}>{children}</span>
      ) : (
        children
      )}
    </div>
  );
}

// For a control that needs the row's full width (a slider) and carries its own label.
export function ControlBlock({ children }: { children: ReactNode }) {
  return <div className={styles.controlBlock}>{children}</div>;
}
