"use client";

import { useI18n } from "@/components/i18n";
import type { WeeklyGoalTemplateForm } from "@/lib/weekly-goal-types";

export type WeeklyGoalFormCardProps = {
  readonly editingTemplateId: string | null;
  readonly form: WeeklyGoalTemplateForm;
  readonly onFormChange: (
    field: keyof WeeklyGoalTemplateForm,
    value: string
  ) => void;
  readonly onResetForm: () => void;
  readonly onSubmit: () => Promise<void>;
  readonly saving: boolean;
};

type WeeklyGoalFieldsProps = {
  readonly form: WeeklyGoalTemplateForm;
  readonly onFormChange: (
    field: keyof WeeklyGoalTemplateForm,
    value: string
  ) => void;
};

function WeeklyGoalFields({ form, onFormChange }: WeeklyGoalFieldsProps) {
  const { t } = useI18n();

  return (
    <>
      <label className="block text-sm font-medium text-slate-600">
        {t("labelTitle")}
        <input
          value={form.title}
          onChange={(event) => onFormChange("title", event.target.value)}
          className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
          placeholder={t("weeklyGoalsTitlePlaceholder")}
        />
      </label>
      <label className="block text-sm font-medium text-slate-600">
        {t("labelDescription")}
        <textarea
          value={form.description}
          onChange={(event) => onFormChange("description", event.target.value)}
          className="mt-2 min-h-[120px] w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
          placeholder={t("weeklyGoalsDescriptionPlaceholder")}
        />
      </label>
    </>
  );
}

export default function WeeklyGoalFormCard({
  editingTemplateId,
  form,
  onFormChange,
  onResetForm,
  onSubmit,
  saving,
}: WeeklyGoalFormCardProps) {
  const { t } = useI18n();
  const title = editingTemplateId
    ? t("weeklyGoalsEditTemplate")
    : t("weeklyGoalsCreateTemplate");

  return (
    <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{t("weeklyGoalsFormSubtitle")}</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <WeeklyGoalFields form={form} onFormChange={onFormChange} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            {saving ? "..." : editingTemplateId ? t("buttonUpdate") : t("buttonCreate")}
          </button>
          {editingTemplateId ? (
            <button
              type="button"
              onClick={onResetForm}
              className="rounded-xl border border-cloud px-4 py-2 text-sm font-semibold text-ink"
            >
              {t("buttonCancel")}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
