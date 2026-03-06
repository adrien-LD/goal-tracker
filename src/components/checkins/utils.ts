import type {
  CalendarDayModel,
  CheckIn,
  CheckInsByDate,
  GoalProgressSummary,
} from "@/components/checkins/types";
import { getMonthGridDates, isSameMonth } from "@/lib/calendar";
import { formatDateLocal } from "@/lib/date";

const COMPLETED_COUNT_DELTA = 1;

type ReadJsonOptions = {
  url: string;
  init?: RequestInit;
};

export async function readJson<T>({ url, init }: ReadJsonOptions): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }

  return body as T;
}

export function resolveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function buildCheckInsByDate(checkIns: CheckIn[]): CheckInsByDate {
  const groups: CheckInsByDate = {};
  checkIns.forEach((checkIn) => {
    const dateItems = groups[checkIn.date] ?? [];
    groups[checkIn.date] = [...dateItems, checkIn];
  });
  return groups;
}

export function buildCalendarDays(
  checkInsByDate: CheckInsByDate,
  displayMonth: Date
): CalendarDayModel[] {
  const gridDates = getMonthGridDates(displayMonth);
  return gridDates.map((gridDate) => {
    const date = formatDateLocal(gridDate);
    return {
      date,
      inCurrentMonth: isSameMonth(gridDate, displayMonth),
      items: checkInsByDate[date] ?? [],
    };
  });
}

export function getCalendarRange(displayMonth: Date) {
  const gridDates = getMonthGridDates(displayMonth);
  return {
    startDate: formatDateLocal(gridDates[0]),
    endDate: formatDateLocal(gridDates[gridDates.length - 1]),
  };
}

export function applyCheckInToggle(
  checkIns: CheckIn[],
  checkIn: CheckIn,
  nextCompleted: boolean
) {
  const delta = nextCompleted ? COMPLETED_COUNT_DELTA : -COMPLETED_COUNT_DELTA;
  return checkIns.map((item) => {
    const isTargetCheckIn = item.id === checkIn.id;
    const isSameGoal = item.goal.id === checkIn.goal.id;

    if (!isTargetCheckIn && !isSameGoal) return item;

    return {
      ...item,
      completed: isTargetCheckIn ? nextCompleted : item.completed,
      goal: {
        ...item.goal,
        completedCount: isSameGoal
          ? item.goal.completedCount + delta
          : item.goal.completedCount,
      },
    };
  });
}

export function applyGoalProgressToggle(
  goals: GoalProgressSummary[],
  checkIn: CheckIn,
  nextCompleted: boolean
) {
  const delta = nextCompleted ? COMPLETED_COUNT_DELTA : -COMPLETED_COUNT_DELTA;
  return goals.map((goal) => {
    if (goal.id !== checkIn.goal.id) return goal;
    return {
      ...goal,
      completedCount: goal.completedCount + delta,
    };
  });
}
