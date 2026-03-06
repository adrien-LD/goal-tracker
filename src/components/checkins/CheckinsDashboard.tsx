"use client";

import ProgressRing from "@/components/ProgressRing";
import { useI18n } from "@/components/i18n";
import type { GoalProgressSummary } from "@/components/checkins/types";

type CheckinsDashboardProps = {
  goals: GoalProgressSummary[];
  message: string;
};

type GoalProgressCardProps = {
  goal: GoalProgressSummary;
};

function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const { t } = useI18n();
  const progressLabel = `${t("goalProgress")}: ${goal.completedCount}/${goal.targetCount}`;

  return (
    <article className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-ink">{goal.title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {goal.description || "-"}
          </p>
        </div>
        <ProgressRing
          completed={goal.completedCount}
          target={goal.targetCount}
          size={96}
          strokeWidth={8}
          label={progressLabel}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-sand px-4 py-3">
          <div className="text-xs text-slate-500">{t("goalProgress")}</div>
          <div className="mt-1 text-sm font-medium text-ink">
            {goal.completedCount}/{goal.targetCount}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{t("goalTargetCount")}</div>
          <div className="mt-1 text-sm font-medium text-ink">
            {goal.targetCount}
          </div>
        </div>
      </div>
      <div className="mt-4 text-xs text-slate-400">
        {goal.startDate} - {goal.endDate}
      </div>
    </article>
  );
}

export default function CheckinsDashboard({
  goals,
  message,
}: CheckinsDashboardProps) {
  const { t } = useI18n();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">{t("dashboardTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("dashboardSubtitle")}</p>
        {message ? (
          <div className="mt-4 rounded-xl bg-sand px-4 py-2 text-sm text-slate-600">
            {message}
          </div>
        ) : null}
      </div>
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cloud bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
          {t("dashboardEmpty")}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </section>
  );
}
