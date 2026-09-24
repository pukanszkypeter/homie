import { Users } from "lucide-react";
import { useState } from "react";
import { ChipGroup } from "@/components/ChipGroup/ChipGroup";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { TaskRow } from "@/components/TaskRow/TaskRow";
import { TodoStatusMessage } from "@/components/TodoStatusMessage/TodoStatusMessage";
import { useTodos } from "@/hooks/useTodos";
import { AddTaskForm } from "./AddTaskForm";
import styles from "./TodosPage.module.css";

export function TodosPage() {
  const { data, error, actionError, addTask, completeTask, deleteTask } = useTodos();
  const [selected, setSelected] = useState<string | null>(null);

  const ready = data?.status === "ok" && data.lists.length > 0;
  const active = ready ? (data.lists.find((l) => l.id === selected) ?? data.lists[0]) : null;

  return (
    <>
      <PageHeader title="Todos">
        {actionError && <span className={styles.error}>{actionError}</span>}
      </PageHeader>
      {!data || !active ? (
        <TodoStatusMessage status={data?.status ?? null} requestFailed={error !== null} />
      ) : (
        <div className={styles.content}>
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
          <AddTaskForm onAdd={(title) => addTask(active.id, title)} />
          {active.tasks.length === 0 ? (
            <p className={styles.empty}>Nothing to do</p>
          ) : (
            <ul className={styles.tasks}>
              {active.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => completeTask(active.id, task.id)}
                  onDelete={() => deleteTask(active.id, task.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
