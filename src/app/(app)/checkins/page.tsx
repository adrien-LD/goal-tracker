"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n";
import { todayLocal } from "@/lib/date";
import ProgressRing from "@/components/ProgressRing";

type CheckIn = {
  id: string;
  date: string;
  completed: boolean;
  goal: {
    id: string;
    title: string;
    description: string;
    targetCount: number;
    completedCount: number;
  };
};

const COMPLETED_COUNT_DELTA = 1;

export default function CheckinsPage() {
  const { t } = useI18n();
  const [date, setDate] = useState(todayLocal());
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCheckins = async (targetDate: string) => {
    const response = await fetch(`/api/checkins?date=${targetDate}`);
    if (!response.ok) return;
    const data = await response.json();
    setCheckIns(data.checkIns || []);
  };

  useEffect(() => {
    loadCheckins(date);
  }, [date]);

  const toggleCheckin = async (checkIn: CheckIn) => {
    if (updatingId === checkIn.id) return;
    setMessage("");
    setUpdatingId(checkIn.id);
    try {
      const response = await fetch(`/api/checkins/${checkIn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !checkIn.completed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage(body.message || t("errorGeneric"));
        return;
      }
      setCheckIns((prev) =>
        prev.map((item) =>
          item.id === checkIn.id
            ? {
                ...item,
                completed: !checkIn.completed,
                goal: {
                  ...item.goal,
                  completedCount:
                    item.goal.completedCount +
                    (checkIn.completed
                      ? -COMPLETED_COUNT_DELTA
                      : COMPLETED_COUNT_DELTA),
                },
              }
            : item
        )
      );
    } catch (error) {
      setMessage(t("errorGeneric"));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t("checkinsTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("checkinsSubtitle")}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-cloud bg-white p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-slate-500">{t("selectDate")}</div>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
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
            <div
              key={checkIn.id}
              className="rounded-2xl border border-cloud bg-white p-5 shadow-soft"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checkIn.completed}
                  disabled={updatingId === checkIn.id}
                  onChange={() => toggleCheckin(checkIn)}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-cloud text-ink accent-ink focus:ring-ink disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`${t("navCheckins")}: ${checkIn.goal.title}`}
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
                    <div className="text-sm text-slate-500">
                      {checkIn.goal.description || "-"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t("goalProgress")}: {checkIn.goal.completedCount}/
                      {checkIn.goal.targetCount}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span>{checkIn.date}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          checkIn.completed
                            ? "border border-mint bg-mint/10 text-mint"
                            : "border border-cloud bg-sand text-slate-500"
                        }`}
                      >
                        {checkIn.completed ? t("statusComplete") : t("statusIncomplete")}
                      </span>
                    </div>
                  </div>
                  <ProgressRing
                    completed={checkIn.goal.completedCount}
                    target={checkIn.goal.targetCount}
                    size={36}
                    strokeWidth={3}
                    label={`${t("goalProgress")}: ${checkIn.goal.completedCount}/${checkIn.goal.targetCount}`}
                  />
                </div>
              </label>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
