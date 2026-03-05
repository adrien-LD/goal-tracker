"use client";

import { useEffect, useMemo, useState } from "react";
import CheckinsCalendarDesktop from "@/components/checkins/CheckinsCalendarDesktop";
import CheckinsListMobile from "@/components/checkins/CheckinsListMobile";
import type {
  CalendarDayModel,
  CheckIn,
  CheckInsByDate,
} from "@/components/checkins/types";
import { todayLocal } from "@/lib/date";
import { useI18n } from "@/components/i18n";
import { addMonths, getMonthGridDates, isSameMonth } from "@/lib/calendar";
import { formatDateLocal, parseDateLocal } from "@/lib/date";

const COMPLETED_COUNT_DELTA = 1;
const PREVIOUS_MONTH_DELTA = -1;
const NEXT_MONTH_DELTA = 1;

function buildCheckInsByDate(checkIns: CheckIn[]): CheckInsByDate {
  const groups: CheckInsByDate = {};
  checkIns.forEach((checkIn) => {
    const dateItems = groups[checkIn.date] ?? [];
    groups[checkIn.date] = [...dateItems, checkIn];
  });
  return groups;
}

function buildCalendarDays(
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

function getCalendarRange(displayMonth: Date) {
  const gridDates = getMonthGridDates(displayMonth);
  return {
    startDate: formatDateLocal(gridDates[0]),
    endDate: formatDateLocal(gridDates[gridDates.length - 1]),
  };
}

function applyCheckInToggle(
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

export default function CheckinsPage() {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [displayMonth, setDisplayMonth] = useState(parseDateLocal(todayLocal()));
  const [mobileCheckIns, setMobileCheckIns] = useState<CheckIn[]>([]);
  const [calendarCheckIns, setCalendarCheckIns] = useState<CheckIn[]>([]);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const checkInsByDate = useMemo(
    () => buildCheckInsByDate(calendarCheckIns),
    [calendarCheckIns]
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(checkInsByDate, displayMonth),
    [checkInsByDate, displayMonth]
  );

  const toggleCheckin = async (checkIn: CheckIn) => {
    if (updatingId === checkIn.id) return;
    setMessage("");
    setUpdatingId(checkIn.id);
    const nextCompleted = !checkIn.completed;

    try {
      const response = await fetch(`/api/checkins/${checkIn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage(body.message || t("errorGeneric"));
        return;
      }
      setMobileCheckIns((prev) =>
        applyCheckInToggle(prev, checkIn, nextCompleted)
      );
      setCalendarCheckIns((prev) =>
        applyCheckInToggle(prev, checkIn, nextCompleted)
      );
    } catch (error) {
      setMessage(t("errorGeneric"));
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const loadMobileCheckIns = async () => {
      const response = await fetch(`/api/checkins?date=${selectedDate}`);
      if (!response.ok) return;
      const data = await response.json();
      setMobileCheckIns(data.checkIns || []);
    };
    loadMobileCheckIns();
  }, [selectedDate]);

  useEffect(() => {
    const loadCalendarCheckIns = async () => {
      const { startDate, endDate } = getCalendarRange(displayMonth);
      const response = await fetch(
        `/api/checkins?startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) return;
      const data = await response.json();
      setCalendarCheckIns(data.checkIns || []);
    };
    loadCalendarCheckIns();
  }, [displayMonth]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t("checkinsTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("checkinsSubtitle")}</p>
      </header>
      <CheckinsCalendarDesktop
        calendarDays={calendarDays}
        displayMonth={displayMonth}
        message={message}
        onNextMonth={() =>
          setDisplayMonth((previousMonth) =>
            addMonths(previousMonth, NEXT_MONTH_DELTA)
          )
        }
        onPrevMonth={() =>
          setDisplayMonth((previousMonth) =>
            addMonths(previousMonth, PREVIOUS_MONTH_DELTA)
          )
        }
        onSelectDate={setSelectedDate}
        onToday={() => {
          const today = todayLocal();
          setSelectedDate(today);
          setDisplayMonth(parseDateLocal(today));
        }}
        onToggleCheckIn={toggleCheckin}
        selectedDate={selectedDate}
        updatingId={updatingId}
      />
      <CheckinsListMobile
        checkIns={mobileCheckIns}
        message={message}
        onSelectDate={setSelectedDate}
        onToggleCheckIn={toggleCheckin}
        selectedDate={selectedDate}
        updatingId={updatingId}
      />
    </div>
  );
}
