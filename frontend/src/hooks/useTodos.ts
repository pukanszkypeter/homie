import { useEffect, useState } from "react";
import { addTodoTask, completeTodoTask, deleteTodoTask, fetchTodos } from "@/api";
import type { TodosResponse, TodoTask } from "@/types";

const REFRESH_MS = 30 * 1000;
// Retry quickly while the backend has not loaded its first data, or after a failed request.
const RETRY_MS = 5 * 1000;

function withoutTask(data: TodosResponse | null, listId: string, taskId: string) {
  if (!data) return data;
  return {
    ...data,
    lists: data.lists.map((list) =>
      list.id === listId ? { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) } : list,
    ),
  };
}

function withTask(data: TodosResponse | null, listId: string, task: TodoTask, index: number) {
  if (!data) return data;
  return {
    ...data,
    lists: data.lists.map((list) => {
      if (list.id !== listId) return list;
      const tasks = list.tasks.filter((t) => t.id !== task.id);
      tasks.splice(index < 0 ? tasks.length : Math.min(index, tasks.length), 0, task);
      return { ...list, tasks };
    }),
  };
}

export function useTodos() {
  const [data, setData] = useState<TodosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      let delay = REFRESH_MS;
      try {
        const next = await fetchTodos();
        if (cancelled) return;
        setData(next);
        setError(null);
        if (next.status === "loading") delay = RETRY_MS;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        delay = RETRY_MS;
      }
      timer = setTimeout(load, delay);
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Complete and delete update the screen straight away and roll back if the request fails,
  // because Microsoft can take a moment to answer.
  const removeOptimistically = async <T>(
    listId: string,
    taskId: string,
    request: () => Promise<T>,
  ): Promise<T | null> => {
    const before = data;
    setActionError(null);
    setData(withoutTask(before, listId, taskId));
    try {
      return await request();
    } catch (err) {
      setData(before);
      setActionError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const completeTask = async (listId: string, taskId: string) => {
    const index = data?.lists.find((l) => l.id === listId)?.tasks.findIndex((t) => t.id === taskId);
    const reply = await removeOptimistically(listId, taskId, () =>
      completeTodoTask(listId, taskId),
    );
    // A recurring task comes back open again with its next due date: put it back in place.
    if (reply && !reply.is_completed) {
      setData((current) => withTask(current, listId, reply, index ?? -1));
    }
  };

  const deleteTask = (listId: string, taskId: string) =>
    removeOptimistically(listId, taskId, () => deleteTodoTask(listId, taskId));

  const addTask = async (listId: string, title: string): Promise<boolean> => {
    setActionError(null);
    try {
      const task = await addTodoTask(listId, title);
      setData((current) =>
        current
          ? {
              ...current,
              lists: current.lists.map((list) =>
                list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list,
              ),
            }
          : current,
      );
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  return { data, error, actionError, addTask, completeTask, deleteTask };
}
