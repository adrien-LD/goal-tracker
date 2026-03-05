const DAYS_IN_WEEK = 7;
const GRID_WEEKS = 6;
const GRID_SIZE = DAYS_IN_WEEK * GRID_WEEKS;

export type CalendarLocale = "zh" | "en";

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getMonthLabel(date: Date, locale: CalendarLocale): string {
  const formatter = new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "long",
    }
  );
  return formatter.format(date);
}

export function startOfWeekMonday(date: Date): Date {
  const normalized = normalizeDate(date);
  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + offset);
  return normalized;
}

export function endOfWeekSunday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = normalizeDate(start);
  end.setDate(start.getDate() + DAYS_IN_WEEK - 1);
  return end;
}

export function getMonthGridDates(displayMonth: Date): Date[] {
  const firstDayOfMonth = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth(),
    1
  );
  const gridStart = startOfWeekMonday(firstDayOfMonth);
  return Array.from({ length: GRID_SIZE }, (_value, index) => {
    const day = normalizeDate(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
