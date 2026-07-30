import { formatMoney, shortAmount } from "@/lib/money-plan";
import type { MoneyPlanDetail, Translate } from "@/components/money/types";

const QUICK_DELTAS = [1000, 3000, 5000, 9000] as const;

type MoneyPlanHeaderProps = {
  plan: MoneyPlanDetail;
  amountInput: string;
  noteInput: string;
  saving: boolean;
  message: string;
  subtitle: string;
  t: Translate;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onQuickDelta: (delta: number) => void;
};

function amountToPct(
  amount: number,
  startAmount: number,
  finalAmount: number
): number {
  const span = finalAmount - startAmount;
  if (span <= 0) return amount >= finalAmount ? 100 : 0;
  const raw = ((amount - startAmount) / span) * 100;
  return Math.min(100, Math.max(0, raw));
}

export default function MoneyPlanHeader({
  plan,
  amountInput,
  noteInput,
  saving,
  message,
  subtitle,
  t,
  onAmountChange,
  onNoteChange,
  onSave,
  onReset,
  onQuickDelta,
}: MoneyPlanHeaderProps) {
  const progressPct = plan.metrics.totalProgressPct;
  const currentPct = amountToPct(
    plan.currentAmount,
    plan.startAmount,
    plan.finalAmount
  );

  return (
    <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        Deadline · {plan.deadline}
      </div>
      <h1 className="text-2xl font-semibold text-ink">{plan.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-cloud bg-sand/60 p-4">
          <div className="text-xs text-slate-500">{t("moneyKpiCurrent")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {formatMoney(plan.currentAmount)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t("moneyDoneStages")
              .replace("{done}", String(plan.metrics.doneCount))
              .replace("{total}", String(plan.stages.length))}
          </div>
        </div>
        <div className="rounded-xl border border-cloud bg-sand/60 p-4">
          <div className="text-xs text-slate-500">{t("moneyKpiGap")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {formatMoney(plan.metrics.gapToFinal)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t("moneyTargetLabel").replace(
              "{amount}",
              formatMoney(plan.finalAmount)
            )}
          </div>
        </div>
        <div className="rounded-xl border border-cloud bg-sand/60 p-4">
          <div className="text-xs text-slate-500">{t("moneyKpiDays")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {plan.metrics.daysLeft} {t("moneyDaysUnit")}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t("moneyDeadlineHint").replace("{date}", plan.deadline)}
          </div>
        </div>
        <div className="rounded-xl border border-cloud bg-sand/60 p-4">
          <div className="text-xs text-slate-500">{t("moneyKpiDaily")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {plan.metrics.gapToFinal === 0
              ? "—"
              : formatMoney(plan.metrics.dailyNeeded)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{t("moneyDailyHint")}</div>
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-dashed border-cloud pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-col gap-1.5 text-xs text-slate-500">
            {t("moneyAmountLabel")}
            <input
              type="number"
              min={0}
              step={100}
              value={amountInput}
              onChange={(event) => onAmountChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave();
              }}
              className="rounded-xl border border-cloud bg-white px-3 py-2.5 text-base tabular-nums text-ink outline-none ring-ink/20 focus:ring-2"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs text-slate-500">
            {t("moneyNoteLabel")}
            <input
              type="text"
              value={noteInput}
              maxLength={80}
              placeholder={t("moneyNotePlaceholder")}
              onChange={(event) => onNoteChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave();
              }}
              className="rounded-xl border border-cloud bg-white px-3 py-2.5 text-sm text-ink outline-none ring-ink/20 focus:ring-2"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t("moneySaving") : t("moneySaveProgress")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onReset}
            className="rounded-full border border-cloud bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-60"
          >
            {t("moneyReset")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{t("moneyQuickAdd")}</span>
          {QUICK_DELTAS.map((delta) => (
            <button
              key={delta}
              type="button"
              disabled={saving}
              onClick={() => onQuickDelta(delta)}
              className="rounded-full border border-cloud bg-sand px-3 py-1 text-xs font-medium text-ink transition hover:border-ink disabled:opacity-60"
            >
              +{delta.toLocaleString("zh-CN")}
            </button>
          ))}
          {message ? (
            <span className="text-sm text-slate-500">{message}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {t("moneyTotalProgress")
              .replace("{pct}", String(Math.round(progressPct)))
              .replace("{net}", formatMoney(plan.metrics.netGain))}
          </span>
          <span>
            {t("moneyAxisStart")} {shortAmount(plan.startAmount)} →{" "}
            {shortAmount(plan.finalAmount)}
          </span>
        </div>

        {/* 金额比例轴：79k 在最左 = 0%，当前位置按金额落点 */}
        <div className="relative pt-1">
          <div className="relative h-2.5 rounded-full border border-cloud bg-sand">
            <div
              className="h-full rounded-full bg-ink transition-all"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-amber-500 shadow-sm"
              style={{ left: `${currentPct}%` }}
              title={formatMoney(plan.currentAmount)}
            />
          </div>

          <div className="relative mt-3 h-8">
            {plan.stages.map((stage, index) => {
              const left = amountToPct(
                stage.targetAmount,
                plan.startAmount,
                plan.finalAmount
              );
              const isOrigin = index === 0;
              const isDone = stage.status === "done";
              const isActive = stage.status === "active";

              return (
                <div
                  key={stage.id}
                  className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{ left: `${left}%` }}
                  title={stage.title}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full border-2 border-ink ${
                      isOrigin
                        ? "bg-slate-300"
                        : isDone
                          ? "bg-ink"
                          : isActive
                            ? "bg-amber-500"
                            : "bg-white"
                    }`}
                  />
                  <span
                    className={`text-[10px] tabular-nums ${
                      isOrigin ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {isOrigin
                      ? `${shortAmount(stage.targetAmount)}·${t("moneyAxisOrigin")}`
                      : shortAmount(stage.targetAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
