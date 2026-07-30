"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n";
import { formatMoney } from "@/lib/money-plan";
import MoneyAmountHistory from "@/components/money/MoneyAmountHistory";
import MoneyPlanCurve from "@/components/money/MoneyPlanCurve";
import MoneyPlanHeader from "@/components/money/MoneyPlanHeader";
import type { MoneyPlanDetail } from "@/components/money/types";

export default function MoneyPlanPage() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<MoneyPlanDetail | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/money-plans");
      if (!response.ok) {
        setMessage(t("moneyLoadError"));
        return;
      }
      const data = await response.json();
      setPlan(data.plan);
      setAmountInput(String(data.plan.currentAmount));
    } catch {
      setMessage(t("moneyLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const subtitle = useMemo(() => {
    if (!plan) return "";
    return t("moneySubtitle")
      .replace("{start}", formatMoney(plan.startAmount))
      .replace("{final}", formatMoney(plan.finalAmount))
      .replace("{net}", formatMoney(plan.finalAmount - plan.startAmount))
      .replace("{count}", String(plan.stages.length));
  }, [plan, t]);

  const saveAmount = async (overrideAmount?: number) => {
    if (!plan) return;
    const amount =
      overrideAmount === undefined ? Number(amountInput) : overrideAmount;
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      setMessage(t("moneyAmountInvalid"));
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const note = noteInput.trim();
      const response = await fetch(`/api/money-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note: note || undefined,
        }),
      });
      if (!response.ok) {
        setMessage(t("moneySaveError"));
        return;
      }
      const data = await response.json();
      setPlan(data.plan);
      setAmountInput(String(data.plan.currentAmount));
      setNoteInput("");
      setMessage(t("successSaved"));
    } catch {
      setMessage(t("moneySaveError"));
    } finally {
      setSaving(false);
    }
  };

  const resetPlan = async () => {
    if (!plan) return;
    if (!window.confirm(t("moneyResetConfirm"))) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/money-plans/${plan.id}/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        setMessage(t("moneyResetError"));
        return;
      }
      const data = await response.json();
      setPlan(data.plan);
      setAmountInput(String(data.plan.currentAmount));
      setNoteInput("");
      setMessage(t("moneyResetDone"));
    } catch {
      setMessage(t("moneyResetError"));
    } finally {
      setSaving(false);
    }
  };

  const applyQuickDelta = (delta: number) => {
    if (!plan) return;
    const base = Number(amountInput);
    const current = Number.isFinite(base) ? base : plan.currentAmount;
    const next = Math.max(0, Math.round(current + delta));
    setAmountInput(String(next));
    void saveAmount(next);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-cloud bg-white p-8 text-sm text-slate-500 shadow-soft">
        {t("moneyLoading")}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-2xl border border-cloud bg-white p-8 shadow-soft">
        <p className="text-sm text-slate-600">{message || t("moneyLoadError")}</p>
        <button
          type="button"
          onClick={loadPlan}
          className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          {t("moneyRetry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
        <h2 className="text-base font-semibold text-ink">{t("moneyCurveTitle")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("moneyCurveHint")}</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-cloud bg-sand/40">
          <MoneyPlanCurve plan={plan} />
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400" />
            {t("moneyCurvePlan")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            {t("moneyCurveCurrent")}
          </span>
        </div>
      </section>

      <MoneyPlanHeader
        plan={plan}
        amountInput={amountInput}
        noteInput={noteInput}
        saving={saving}
        message={message}
        subtitle={subtitle}
        t={t}
        onAmountChange={setAmountInput}
        onNoteChange={setNoteInput}
        onSave={() => {
          void saveAmount();
        }}
        onReset={() => {
          void resetPlan();
        }}
        onQuickDelta={applyQuickDelta}
      />

      <MoneyAmountHistory logs={plan.logs} t={t} />
    </div>
  );
}
