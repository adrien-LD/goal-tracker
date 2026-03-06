"use client";

import type { Dispatch, SetStateAction } from "react";
import CheckinsCalendarDesktop from "@/components/checkins/CheckinsCalendarDesktop";
import CheckinsListMobile from "@/components/checkins/CheckinsListMobile";
import type { CalendarDayModel, CheckIn } from "@/components/checkins/types";
import { addMonths } from "@/lib/calendar";
import { parseDateLocal, todayLocal } from "@/lib/date";

const PREVIOUS_MONTH_DELTA = -1;
const NEXT_MONTH_DELTA = 1;

type CheckinsTabPanelProps = {
  calendarDays: CalendarDayModel[];
  displayMonth: Date;
  message: string;
  mobileCheckIns: CheckIn[];
  onSelectDate: (date: string) => void;
  onToggleCheckIn: (checkIn: CheckIn) => Promise<void>;
  selectedDate: string;
  setDisplayMonth: Dispatch<SetStateAction<Date>>;
  updatingId: string | null;
};

export default function CheckinsTabPanel({
  calendarDays,
  displayMonth,
  message,
  mobileCheckIns,
  onSelectDate,
  onToggleCheckIn,
  selectedDate,
  setDisplayMonth,
  updatingId,
}: CheckinsTabPanelProps) {
  return (
    <>
      <div className="lg:-mx-4 xl:-mx-8 2xl:-mx-10">
        <CheckinsCalendarDesktop
          calendarDays={calendarDays}
          displayMonth={displayMonth}
          message={message}
          onNextMonth={() => setDisplayMonth((prev) => addMonths(prev, NEXT_MONTH_DELTA))}
          onPrevMonth={() => setDisplayMonth((prev) => addMonths(prev, PREVIOUS_MONTH_DELTA))}
          onSelectDate={onSelectDate}
          onToday={() => {
            const today = todayLocal();
            onSelectDate(today);
            setDisplayMonth(parseDateLocal(today));
          }}
          onToggleCheckIn={onToggleCheckIn}
          updatingId={updatingId}
        />
      </div>
      <CheckinsListMobile
        checkIns={mobileCheckIns}
        message={message}
        onSelectDate={onSelectDate}
        onToggleCheckIn={onToggleCheckIn}
        selectedDate={selectedDate}
        updatingId={updatingId}
      />
    </>
  );
}
