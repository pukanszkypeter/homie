const dayFormat = new Intl.DateTimeFormat([], { weekday: "short", day: "numeric", month: "short" });

export interface DueLabel {
  text: string;
  overdue: boolean;
}

/** Describes a "YYYY-MM-DD" due date relative to today, in the viewer's local time. */
export function formatDue(dueDate: string, now: Date = new Date()): DueLabel {
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return { text: "Today", overdue: false };
  if (days === 1) return { text: "Tomorrow", overdue: false };
  if (days === -1) return { text: "Yesterday", overdue: true };
  return { text: dayFormat.format(due), overdue: days < 0 };
}
