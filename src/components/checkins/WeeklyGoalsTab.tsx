"use client";

import ProgressRing from "@/components/ProgressRing";
import { useI18n } from "@/components/i18n";
import WeeklyGoalFormCard from "@/components/checkins/WeeklyGoalFormCard";
import type { WeeklyGoalCurrentItem, WeeklyGoalsPayload, WeeklyGoalTemplateForm } from "@/lib/weekly-goal-types";
type WeeklyGoalsTabProps = {
  readonly data: WeeklyGoalsPayload | null;
  readonly deletingTemplateId: string | null;
  readonly editingTemplateId: string | null;
  readonly form: WeeklyGoalTemplateForm;
  readonly loading: boolean;
  readonly message: string;
  readonly onDeleteTemplate: (templateId: string) => Promise<void>;
  readonly onFormChange: (
    field: keyof WeeklyGoalTemplateForm,
    value: string
  ) => void;
  readonly onResetForm: () => void;
  readonly onStartEditing: (item: WeeklyGoalCurrentItem) => void;
  readonly onSubmit: () => Promise<void>;
  readonly onToggleWeeklyGoal: (item: WeeklyGoalCurrentItem) => Promise<void>;
  readonly saving: boolean;
  readonly togglingId: string | null;
};

type WeeklyGoalCardProps = {
  readonly item: WeeklyGoalCurrentItem;
  readonly deletingTemplateId: string | null;
  readonly editingTemplateId: string | null;
  readonly onDeleteTemplate: (templateId: string) => Promise<void>;
  readonly onStartEditing: (item: WeeklyGoalCurrentItem) => void;
  readonly onToggleWeeklyGoal: (item: WeeklyGoalCurrentItem) => Promise<void>;
  readonly togglingId: string | null;
};

function WeeklyGoalActions({
  deletingTemplateId,
  editingTemplateId,
  item,
  onDeleteTemplate,
  onStartEditing,
}: Pick<
  WeeklyGoalCardProps,
  | "deletingTemplateId"
  | "editingTemplateId"
  | "item"
  | "onDeleteTemplate"
  | "onStartEditing"
>) {
  const { t } = useI18n();
  if (item.templateDeleted) {
    return (
      <span className="rounded-full border border-cloud bg-sand px-3 py-1 text-xs text-slate-500">
        {t("weeklyGoalsDeletedBadge")}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onStartEditing(item)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          editingTemplateId === item.templateId
            ? "border-ink text-ink"
            : "border-cloud text-slate-500 hover:border-ink hover:text-ink"
        }`}
      >
        {t("buttonEdit")}
      </button>
      <button
        type="button"
        disabled={deletingTemplateId === item.templateId}
        onClick={() => void onDeleteTemplate(item.templateId)}
        className="rounded-full border border-cloud px-3 py-1 text-xs font-medium text-red-500 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("weeklyGoalsStopRepeating")}
      </button>
    </>
  );
}
function WeeklyGoalStatus({
  item,
  onToggleWeeklyGoal,
  togglingId,
}: Pick<WeeklyGoalCardProps, "item" | "onToggleWeeklyGoal" | "togglingId">) {
  const { t } = useI18n();
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={item.completed}
        disabled={togglingId === item.id}
        onChange={() => void onToggleWeeklyGoal(item)}
        className="mt-1 h-5 w-5 cursor-pointer rounded border-cloud text-ink accent-ink focus:ring-ink disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="min-w-0 flex-1">
        <div
          className={`text-base font-semibold ${
            item.completed ? "text-slate-400 line-through" : "text-ink"
          }`}
        >
          {item.title}
        </div>
        <div className="mt-1 text-sm text-slate-500">{item.description || "-"}</div>
      </div>
    </label>
  );
}

function WeeklyGoalCard(props: WeeklyGoalCardProps) {
  const { t } = useI18n();
  const {
    deletingTemplateId,
    editingTemplateId,
    item,
    onDeleteTemplate,
    onStartEditing,
    onToggleWeeklyGoal,
    togglingId,
  } = props;
  return (
    <article className="rounded-2xl border border-cloud bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <WeeklyGoalStatus
          item={item}
          onToggleWeeklyGoal={onToggleWeeklyGoal}
          togglingId={togglingId}
        />
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <WeeklyGoalActions
            deletingTemplateId={deletingTemplateId}
            editingTemplateId={editingTemplateId}
            item={item}
            onDeleteTemplate={onDeleteTemplate}
            onStartEditing={onStartEditing}
          />
        </div>
      </div>
      {item.templateDeleted ? (
        <div className="mt-3 text-xs text-slate-400">
          {t("weeklyGoalsTemplateDeletedHint")}
        </div>
      ) : null}
    </article>
  );
}

function WeeklyGoalsSummary({ data }: { readonly data: WeeklyGoalsPayload | null }) {
  const { t } = useI18n();
  const completedCount = data?.currentWeek.completedCount ?? 0;
  const totalCount = data?.currentWeek.totalCount ?? 0;
  const pendingCount = Math.max(totalCount - completedCount, 0);
  const progressLabel = `${t("weeklyGoalsSummaryLabel")}: ${completedCount}/${totalCount}`;
  return (
    <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-slate-500">{t("weeklyGoalsCurrentWeek")}</div>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {data?.currentWeek.weekStartDate ?? "--"} - {data?.currentWeek.weekEndDate ?? "--"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t("weeklyGoalsSubtitle")}</p>
        </div>
        <ProgressRing
          completed={completedCount}
          target={Math.max(totalCount, 1)}
          size={88}
          strokeWidth={8}
          label={progressLabel}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-sand px-4 py-3">
          <div className="text-xs text-slate-500">{t("statusComplete")}</div>
          <div className="mt-1 text-sm font-medium text-ink">{completedCount}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{t("weeklyGoalsPendingLabel")}</div>
          <div className="mt-1 text-sm font-medium text-ink">{pendingCount}</div>
        </div>
      </div>
    </section>
  );
}

function WeeklyHistorySection({
  data,
  onToggleWeeklyGoal,
  togglingId,
}: Pick<WeeklyGoalsTabProps, "data" | "onToggleWeeklyGoal" | "togglingId">) {
  const { t } = useI18n();
  const historyWeeks = data?.historyWeeks ?? [];
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">{t("weeklyGoalsHistoryTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("weeklyGoalsHistorySubtitle")}</p>
      </div>
      {historyWeeks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cloud bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
          {t("weeklyGoalsHistoryEmpty")}
        </div>
      ) : (
        historyWeeks.map((week) => (
          <article
            key={week.weekStartDate}
            className="rounded-2xl border border-cloud bg-white p-6 shadow-soft"
          >
            <div className="text-sm font-medium text-slate-500">
              {week.weekStartDate} - {week.weekEndDate}
            </div>
            <div className="mt-4 space-y-3">
              {week.items.map((item) => (
                <WeeklyGoalStatus
                  key={item.id}
                  item={item}
                  onToggleWeeklyGoal={onToggleWeeklyGoal}
                  togglingId={togglingId}
                />
              ))}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function CurrentWeekSection(props: WeeklyGoalsTabProps) {
  const { t } = useI18n();
  const currentItems = props.data?.currentWeek.items ?? [];
  if (props.loading) {
    return (
      <div className="rounded-2xl border border-cloud bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
        ...
      </div>
    );
  }

  if (currentItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cloud bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
        {t("weeklyGoalsCurrentWeekEmpty")}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {currentItems.map((item) => (
        <WeeklyGoalCard
          key={item.id}
          item={item}
          deletingTemplateId={props.deletingTemplateId}
          editingTemplateId={props.editingTemplateId}
          onDeleteTemplate={props.onDeleteTemplate}
          onStartEditing={props.onStartEditing}
          onToggleWeeklyGoal={props.onToggleWeeklyGoal}
          togglingId={props.togglingId}
        />
      ))}
    </div>
  );
}

export default function WeeklyGoalsTab(props: WeeklyGoalsTabProps) {
  return (
    <section className="space-y-6">
      {props.message ? (
        <div className="rounded-2xl border border-cloud bg-white p-4 text-sm text-slate-600 shadow-soft">
          {props.message}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <WeeklyGoalsSummary data={props.data} />
          <CurrentWeekSection {...props} />
        </div>
        <WeeklyGoalFormCard
          editingTemplateId={props.editingTemplateId}
          form={props.form}
          onFormChange={props.onFormChange}
          onResetForm={props.onResetForm}
          onSubmit={props.onSubmit}
          saving={props.saving}
        />
      </div>
      <WeeklyHistorySection
        data={props.data}
        onToggleWeeklyGoal={props.onToggleWeeklyGoal}
        togglingId={props.togglingId}
      />
    </section>
  );
}
