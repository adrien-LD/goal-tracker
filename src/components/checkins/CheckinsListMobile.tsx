"use client";

import ProgressRing from "@/components/ProgressRing";
import { useI18n } from "@/components/i18n";
import type { CheckIn } from "@/components/checkins/types";

type CheckinsListMobileProps = {
  checkIns: CheckIn[];
  message: string;
  onSelectDate: (nextDate: string) => void;
  onToggleCheckIn: (checkIn: CheckIn) => void;
  selectedDate: string;
  updatingId: string | null;
};

type MobileCheckInCardProps = {
  checkIn: CheckIn;
  onToggleCheckIn: (checkIn: CheckIn) => void;
  progressLabel: string;
  statusComplete: string;
  statusIncomplete: string;
  updatingId: string | null;
};

function MobileCheckInCard({
  checkIn,
  onToggleCheckIn,
  progressLabel,
  statusComplete,
  statusIncomplete,
  updatingId,
}: MobileCheckInCardProps) {
  const statusText = checkIn.completed ? statusComplete : statusIncomplete;
  const progressText = `${progressLabel}: ${checkIn.goal.completedCount}/${checkIn.goal.targetCount}`;

  return (
    <div className="rounded-2xl border border-cloud bg-white p-5 shadow-soft">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checkIn.completed}
          disabled={updatingId === checkIn.id}
          onChange={() => onToggleCheckIn(checkIn)}
          className="mt-1 h-5 w-5 cursor-pointer rounded border-cloud text-ink accent-ink focus:ring-ink disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex flex-1 items-start justify-between gap-3">
          <div className="flex-1">
            <div
              className={`text-base font-semibold ${
                checkIn.completed ? "text-slate-400 line-through" : "text-ink"
              }`}
            >
              {checkIn.goal.title}
            </div>
            <div className="text-sm text-slate-500">{checkIn.goal.description || "-"}</div>
            <div className="mt-1 text-xs text-slate-500">{progressText}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>{checkIn.date}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  checkIn.completed
                    ? "border border-mint bg-mint/10 text-mint"
                    : "border border-cloud bg-sand text-slate-500"
                }`}
              >
                {statusText}
              </span>
            </div>
          </div>
          <ProgressRing
            completed={checkIn.goal.completedCount}
            target={checkIn.goal.targetCount}
            size={36}
            strokeWidth={3}
            label={progressText}
          />
        </div>
      </label>
    </div>
  );
}

export default function CheckinsListMobile({
  checkIns,
  message,
  onSelectDate,
  onToggleCheckIn,
  selectedDate,
  updatingId,
}: CheckinsListMobileProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 lg:hidden">
      <section className="flex flex-col gap-4 rounded-2xl border border-cloud bg-white p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-slate-500">{t("selectDate")}</div>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onSelectDate(event.target.value)}
            className="mt-2 rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
          />
        </div>
        {message ? (
          <div className="rounded-xl bg-sand px-4 py-2 text-sm text-slate-600">
            {message}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {checkIns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cloud bg-white p-8 text-center text-sm text-slate-500">
            {t("noGoals")}
          </div>
        ) : (
          checkIns.map((checkIn) => (
            <MobileCheckInCard
              key={checkIn.id}
              checkIn={checkIn}
              onToggleCheckIn={onToggleCheckIn}
              progressLabel={t("goalProgress")}
              statusComplete={t("statusComplete")}
              statusIncomplete={t("statusIncomplete")}
              updatingId={updatingId}
            />
          ))
        )}
      </section>
    </div>
  );
}
