const SHORT = new Intl.DateTimeFormat("en-GB", { month: "short" });
const LONG = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** Months are "YYYY-MM" strings everywhere; Date is only used for display. */
export const monthKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

export const shortMonthName = (monthIndex: number) => SHORT.format(new Date(2000, monthIndex, 1));

export function longMonthName(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return LONG.format(new Date(year, month - 1, 1));
}

export function shortMonthOf(key: string): string {
  return shortMonthName(Number(key.split("-")[1]) - 1);
}

/** "Jan 26": for charts that span several years. */
export function shortMonthYearOf(key: string): string {
  return `${shortMonthOf(key)} ${key.slice(2, 4)}`;
}
