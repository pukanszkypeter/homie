import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface Props {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </header>
  );
}
