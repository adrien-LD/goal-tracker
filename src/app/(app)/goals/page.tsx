"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n";

type Goal = {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  startDate: string;
  endDate: string;
};

const DEFAULT_TARGET_COUNT = "1";
const TARGET_COUNT_MIN = 1;
const TARGET_COUNT_STEP = 1;

const emptyForm = {
  title: "",
  description: "",
  targetCount: DEFAULT_TARGET_COUNT,
  startDate: "",
  endDate: "",
};

function isValidTargetCount(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= TARGET_COUNT_MIN;
}

export default function GoalsPage() {
  const { t } = useI18n();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isEditing = Boolean(editingId);

  const loadGoals = async () => {
    const response = await fetch("/api/goals");
    if (!response.ok) return;
    const data = await response.json();
    setGoals(data.goals || []);
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!form.title || !form.startDate || !form.endDate) {
      setMessage(t("errorRequired"));
      return;
    }

    if (!isValidTargetCount(form.targetCount)) {
      setMessage(t("errorTargetCount"));
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, targetCount: Number(form.targetCount) };
      const response = await fetch(`/api/goals${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage(body.message || t("errorGeneric"));
        return;
      }

      setMessage(editingId ? t("successUpdated") : t("successSaved"));
      setForm(emptyForm);
      setEditingId(null);
      await loadGoals();
    } catch (err) {
      setMessage(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description,
      targetCount: String(goal.targetCount),
      startDate: goal.startDate,
      endDate: goal.endDate,
    });
  };

  const handleDelete = async (goalId: string) => {
    setMessage("");
    const response = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.message || t("errorGeneric"));
      return;
    }
    setMessage(t("successDeleted"));
    if (editingId === goalId) {
      setEditingId(null);
      setForm(emptyForm);
    }
    await loadGoals();
  };

  const summary = useMemo(() => {
    if (!goals.length) return t("noGoals");
    return `${goals.length} ${t("navGoals")}`;
  }, [goals.length, t]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-ink">{t("goalsTitle")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("goalsSubtitle")}</p>
        </header>
        <div className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">{summary}</div>
          </div>
          <div className="mt-4 space-y-4">
            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cloud p-6 text-center text-sm text-slate-500">
                {t("noGoals")}
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex flex-col gap-3 rounded-2xl border border-cloud p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-base font-semibold text-ink">{goal.title}</div>
                    <div className="text-sm text-slate-500">{goal.description || "-"}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {t("goalTargetCount")}: {goal.targetCount}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {goal.startDate} - {goal.endDate}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="rounded-full border border-cloud px-3 py-1 text-xs font-medium text-ink transition hover:border-ink"
                    >
                      {t("buttonEdit")}
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="rounded-full border border-cloud px-3 py-1 text-xs font-medium text-red-500 transition hover:border-red-300"
                    >
                      {t("buttonDelete")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">
          {isEditing ? t("editGoal") : t("createGoal")}
        </h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-600">
            {t("labelTitle")}
            <input
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
              placeholder={t("labelTitle")}
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            {t("labelDescription")}
            <textarea
              value={form.description}
              onChange={(event) => handleChange("description", event.target.value)}
              className="mt-2 min-h-[90px] w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
              placeholder={t("labelDescription")}
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            {t("labelTargetCount")}
            <input
              type="number"
              min={TARGET_COUNT_MIN}
              step={TARGET_COUNT_STEP}
              value={form.targetCount}
              onChange={(event) => handleChange("targetCount", event.target.value)}
              className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-600">
              {t("labelStartDate")}
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => handleChange("startDate", event.target.value)}
                className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              {t("labelEndDate")}
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => handleChange("endDate", event.target.value)}
                className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
              />
            </label>
          </div>
          {message ? (
            <div className="rounded-xl bg-sand px-4 py-2 text-sm text-slate-600">
              {message}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={loading}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {loading ? "..." : isEditing ? t("buttonUpdate") : t("buttonCreate")}
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-xl border border-cloud px-4 py-2 text-sm font-semibold text-ink"
              >
                {t("buttonCancel")}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
