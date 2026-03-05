"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n";
import type { CalendarDayModel, CheckIn } from "@/components/checkins/types";
import { getMonthLabel, isSameDate } from "@/lib/calendar";
import { parseDateLocal } from "@/lib/date";

const MAX_ITEMS_PER_DAY = 3;
const MONTH_STEP = 1;

type CheckinsCalendarDesktopProps = {
  calendarDays: CalendarDayModel[];
  displayMonth: Date;
  message: string;
  onNextMonth: () => void;
  onPrevMonth: () => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
  onToggleCheckIn: (checkIn: CheckIn) => void;
  selectedDate: string;
  updatingId: string | null;
};

type DayCheckInItemProps = {
  checkIn: CheckIn;
  onToggleCheckIn: (checkIn: CheckIn) => void;
  updatingId: string | null;
};

type DayMorePopoverProps = {
  dayItems: CheckIn[];
  onToggleCheckIn: (checkIn: CheckIn) => void;
  updatingId: string | null;
};

type CalendarDayCellProps = {
  day: CalendarDayModel;
  expandedDate: string | null;
  onSelectDate: (date: string) => void;
  onToggleCheckIn: (checkIn: CheckIn) => void;
  setExpandedDate: (date: string | null) => void;
  selectedDate: string;
  updatingId: string | null;
};

function getDayLabel(day: Date, inCurrentMonth: boolean, locale: "zh" | "en") {
  if (inCurrentMonth) return String(day.getDate());
  if (locale === "zh") return `${day.getMonth() + MONTH_STEP}月${day.getDate()}日`;
  return `${day.getMonth() + MONTH_STEP}/${day.getDate()}`;
}

function DayCheckInItem({
  checkIn,
  onToggleCheckIn,
  updatingId,
}: DayCheckInItemProps) {
  return (
    <label className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checkIn.completed}
        disabled={updatingId === checkIn.id}
        onChange={() => onToggleCheckIn(checkIn)}
        className="h-3.5 w-3.5 rounded border-cloud accent-ink"
      />
      <span
        className={`truncate ${
          checkIn.completed ? "text-slate-400 line-through" : "text-slate-600"
        }`}
      >
        {checkIn.goal.title}
      </span>
    </label>
  );
}

function DayMorePopover({
  dayItems,
  onToggleCheckIn,
  updatingId,
}: DayMorePopoverProps) {
  const { t } = useI18n();

  return (
    <div
      className="absolute left-2 right-2 top-16 z-20 max-h-52 overflow-auto rounded-lg border border-cloud bg-white p-2 shadow-soft"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-1 text-xs font-medium text-slate-500">{t("calendarMore")}</div>
      <div className="space-y-1">
        {dayItems.map((checkIn) => (
          <DayCheckInItem
            key={checkIn.id}
            checkIn={checkIn}
            onToggleCheckIn={onToggleCheckIn}
            updatingId={updatingId}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarDayCell({
  day,
  expandedDate,
  onSelectDate,
  onToggleCheckIn,
  selectedDate,
  setExpandedDate,
  updatingId,
}: CalendarDayCellProps) {
  const { locale, t } = useI18n();
  const dayDate = parseDateLocal(day.date);
  const dayItems = day.items;
  const visibleItems = dayItems.slice(0, MAX_ITEMS_PER_DAY);
  const hiddenItems = dayItems.slice(MAX_ITEMS_PER_DAY);
  const isExpanded = expandedDate === day.date;
  const isSelected = isSameDate(dayDate, parseDateLocal(selectedDate));

  return (
    <article
      className={`relative min-h-36 border border-cloud p-2 ${
        day.inCurrentMonth ? "bg-white" : "bg-slate-50"
      } ${isSelected ? "ring-2 ring-ink/15" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelectDate(day.date);
      }}
    >
      <div className={`text-right text-sm ${day.inCurrentMonth ? "text-ink" : "text-slate-400"}`}>
        {getDayLabel(dayDate, day.inCurrentMonth, locale)}
      </div>
      <div className="mt-2 space-y-1">
        {visibleItems.map((checkIn) => (
          <DayCheckInItem
            key={checkIn.id}
            checkIn={checkIn}
            onToggleCheckIn={onToggleCheckIn}
            updatingId={updatingId}
          />
        ))}
        {dayItems.length === 0 ? (
          <div className="px-1 text-xs text-slate-400">{t("calendarEmptyDay")}</div>
        ) : null}
      </div>
      {hiddenItems.length > 0 ? (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-slate-500 hover:text-ink"
          onClick={(event) => {
            event.stopPropagation();
            setExpandedDate(isExpanded ? null : day.date);
          }}
        >
          +{hiddenItems.length} {t("calendarMore")}
        </button>
      ) : null}
      {isExpanded ? (
        <DayMorePopover
          dayItems={dayItems}
          onToggleCheckIn={onToggleCheckIn}
          updatingId={updatingId}
        />
      ) : null}
    </article>
  );
}

export default function CheckinsCalendarDesktop({
  calendarDays,
  displayMonth,
  message,
  onNextMonth,
  onPrevMonth,
  onSelectDate,
  onToday,
  onToggleCheckIn,
  selectedDate,
  updatingId,
}: CheckinsCalendarDesktopProps) {
  const { locale, t } = useI18n();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const weekdays = useMemo(
    () => [
      t("weekdayMon"),
      t("weekdayTue"),
      t("weekdayWed"),
      t("weekdayThu"),
      t("weekdayFri"),
      t("weekdaySat"),
      t("weekdaySun"),
    ],
    [t]
  );

  return (
    <section className="hidden space-y-4 lg:block">
      <div className="rounded-2xl border border-cloud bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">{getMonthLabel(displayMonth, locale)}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevMonth}
              className="rounded-lg border border-cloud px-3 py-1 text-sm text-ink hover:border-ink"
            >
              {t("calendarPrevMonth")}
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-lg border border-cloud px-3 py-1 text-sm text-ink hover:border-ink"
            >
              {t("calendarToday")}
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="rounded-lg border border-cloud px-3 py-1 text-sm text-ink hover:border-ink"
            >
              {t("calendarNextMonth")}
            </button>
          </div>
        </div>
        {message ? (
          <div className="mb-3 rounded-xl bg-sand px-4 py-2 text-sm text-slate-600">
            {message}
          </div>
        ) : null}
        <div className="grid grid-cols-7 border-x border-t border-cloud text-center text-xs text-slate-500">
          {weekdays.map((weekday) => (
            <div key={weekday} className="border-b border-cloud py-2">
              {weekday}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-7 border-l border-cloud"
          onClick={() => setExpandedDate(null)}
        >
          {calendarDays.map((day) => (
            <CalendarDayCell
              key={day.date}
              day={day}
              expandedDate={expandedDate}
              onSelectDate={onSelectDate}
              onToggleCheckIn={onToggleCheckIn}
              selectedDate={selectedDate}
              setExpandedDate={setExpandedDate}
              updatingId={updatingId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
