import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./Widget.module.css";

interface Props {
  title: string;
  icon: LucideIcon;
  to?: string;
  children: ReactNode;
}

export function Widget({ title, icon: Icon, to, children }: Props) {
  const content = (
    <>
      <div className={styles.header}>
        <Icon size={20} aria-hidden />
        <h2 className={styles.title}>{title}</h2>
      </div>
      {children}
    </>
  );

  return to ? (
    <Link to={to} className={styles.widget}>
      {content}
    </Link>
  ) : (
    <section className={styles.widget}>{content}</section>
  );
}
