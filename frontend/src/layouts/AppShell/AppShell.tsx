import { Outlet } from "react-router";
import { NavRail } from "@/components/NavRail/NavRail";
import styles from "./AppShell.module.css";

export function AppShell() {
  return (
    <div className={styles.shell}>
      <div className={styles.nav}>
        <NavRail />
      </div>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
