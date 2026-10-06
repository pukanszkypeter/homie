import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import styles from "./Dialog.module.css";

interface Props {
  title: string;
  onClose: () => void;
  // "compact" for a short list of settings that would look stretched at the default width.
  size?: "default" | "compact";
  children: ReactNode;
}

export function Dialog({ title, onClose, size = "default", children }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${styles.dialog} ${size === "compact" ? styles.compact : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={24} aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
