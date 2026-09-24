const timeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatTime(date: Date): string {
  return timeFormat.format(date);
}
