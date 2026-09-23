import { Mic } from "lucide-react";
import { NavLink } from "react-router";
import { navItems } from "./navItems";
import styles from "./NavRail.module.css";

export function NavRail() {
  return (
    <nav className={styles.nav} aria-label="Main">
      <ul className={styles.list}>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <Icon size={28} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
        <li className={styles.assistant}>
          <button type="button" className={styles.item} disabled aria-label="Lilly (coming soon)">
            <Mic size={28} aria-hidden />
            <span>Lilly</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
