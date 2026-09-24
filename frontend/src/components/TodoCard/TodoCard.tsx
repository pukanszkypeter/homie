import { Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ChipGroup } from "@/components/ChipGroup/ChipGroup";
import { TaskRow } from "@/components/TaskRow/TaskRow";
import { TodoStatusMessage } from "@/components/TodoStatusMessage/TodoStatusMessage";
import { useTodos } from "@/hooks/useTodos";
import styles from "./TodoCard.module.css";

const VISIBLE_TASKS = 3;

export function TodoCard() {
  const { data, error, actionError, completeTask } = useTodos();
  const [selected, setSelected] = useState<string | null>(null);

  if (!data || data.status !== "ok" || data.lists.length === 0) {
    return <TodoStatusMessage status={data?.status ?? null} requestFailed={error !== null} />;
  }

  const active = data.lists.find((l) => l.id === selected) ?? data.lists[0];
  const visible = active.tasks.slice(0, VISIBLE_TASKS);
  const hiddenCount = active.tasks.length - visible.length;

  return (
    <div className={styles.card}>
      <ChipGroup
        label="Todo list"
        options={data.lists.map((l) => ({
          value: l.id,
          label: l.name,
          icon: l.is_shared ? Users : undefined,
        }))}
        selected={active.id}
        onSelect={setSelected}
      />
      {visible.length === 0 ? (
        <p className={styles.empty}>Nothing to do</p>
      ) : (
        <ul className={styles.tasks}>
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={() => completeTask(active.id, task.id)}
            />
          ))}
        </ul>
      )}
      {actionError && <p className={styles.error}>{actionError}</p>}
      <p className={styles.footer}>
        {hiddenCount > 0 && <span>+{hiddenCount} more · </span>}
        <Link to="/todos">Open todos</Link>
      </p>
    </div>
  );
}
