import { endOfWeekSunday, startOfWeekMonday } from "@/lib/calendar";
import { formatDateLocal } from "@/lib/date";

export type WeekRange = {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
};

type ResolveTemplateWeekStartDatesOptions = {
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly now: Date;
};

type WeekDatedItem = {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
};

type BuildWeeklyHistoryGroupsOptions<TItem extends WeekDatedItem> = {
  readonly currentWeekStartDate: string;
  readonly items: readonly TItem[];
};

export type WeeklyHistoryGroup<TItem extends WeekDatedItem> = WeekRange & {
  readonly items: readonly TItem[];
};

function addWeek(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + 7);
  return next;
}

export function resolveWeekRange(date: Date): WeekRange {
  const weekStart = startOfWeekMonday(date);
  const weekEnd = endOfWeekSunday(date);
  return {
    weekStartDate: formatDateLocal(weekStart),
    weekEndDate: formatDateLocal(weekEnd),
  };
}

export function resolveTemplateWeekStartDates({
  createdAt,
  deletedAt,
  now,
}: ResolveTemplateWeekStartDatesOptions) {
  const firstWeek = startOfWeekMonday(createdAt);
  const lastWeek = startOfWeekMonday(deletedAt ?? now);

  if (lastWeek < firstWeek) {
    return [];
  }

  const weekStarts: string[] = [];
  for (let cursor = firstWeek; cursor <= lastWeek; cursor = addWeek(cursor)) {
    weekStarts.push(formatDateLocal(cursor));
  }
  return weekStarts;
}

export function buildWeeklyHistoryGroups<TItem extends WeekDatedItem>({
  currentWeekStartDate,
  items,
}: BuildWeeklyHistoryGroupsOptions<TItem>) {
  const currentWeekItems: TItem[] = [];
  const historyMap = new Map<string, WeeklyHistoryGroup<TItem>>();

  items.forEach((item) => {
    if (item.weekStartDate === currentWeekStartDate) {
      currentWeekItems.push(item);
      return;
    }

    const existing = historyMap.get(item.weekStartDate);
    if (existing) {
      historyMap.set(item.weekStartDate, {
        ...existing,
        items: [...existing.items, item],
      });
      return;
    }

    historyMap.set(item.weekStartDate, {
      weekStartDate: item.weekStartDate,
      weekEndDate: item.weekEndDate,
      items: [item],
    });
  });

  const historyWeeks = [...historyMap.values()].sort((left, right) =>
    right.weekStartDate.localeCompare(left.weekStartDate)
  );

  return {
    currentWeekItems,
    historyWeeks,
  };
}
