import type { TodosStatus } from "@/types";
import styles from "./TodoStatusMessage.module.css";

interface Props {
  status: TodosStatus | null;
  requestFailed: boolean;
}

function describe(status: TodosStatus | null, requestFailed: boolean): string {
  if (status === "not_configured") return "Microsoft To Do isn't set up yet";
  if (status === "sign_in_required") return "Sign in to Microsoft To Do (see the backend README)";
  if (status === "unavailable" || requestFailed) return "Todos not available right now";
  if (status === "ok") return "No todo lists selected (see the backend README)";
  return "Loading todos…";
}

export function TodoStatusMessage({ status, requestFailed }: Props) {
  return <p className={styles.message}>{describe(status, requestFailed)}</p>;
}
