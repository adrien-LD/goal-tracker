import { formatMoney } from "@/lib/money-plan";
import type { MoneyAmountLogView, Translate } from "@/components/money/types";

const NOTE_KEYS = {
  plan_created: "moneyNoteCreated",
  amount_update: "moneyNoteUpdate",
  reset: "moneyNoteReset",
} as const;

function formatLogTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function noteLabel(note: string | null, t: Translate): string {
  if (!note) return t("moneyNoteUpdate");
  if (note in NOTE_KEYS) {
    return t(NOTE_KEYS[note as keyof typeof NOTE_KEYS]);
  }
  return note;
}

type MoneyAmountHistoryProps = {
  logs: MoneyAmountLogView[];
  t: Translate;
};

export default function MoneyAmountHistory({
  logs,
  t,
}: MoneyAmountHistoryProps) {
  return (
    <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
      <h2 className="text-base font-semibold text-ink">{t("moneyHistoryTitle")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("moneyHistoryHint")}</p>

      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{t("moneyHistoryEmpty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-cloud">
          {logs.map((log) => {
            const positive = log.delta > 0;
            const negative = log.delta < 0;
            const deltaText =
              log.delta === 0
                ? "—"
                : `${positive ? "+" : ""}${formatMoney(log.delta)}`;
            return (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <div className="font-medium tabular-nums text-ink">
                    {formatMoney(log.amount)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formatLogTime(log.createdAt)} · {noteLabel(log.note, t)}
                  </div>
                </div>
                <div
                  className={`tabular-nums text-sm font-medium ${
                    positive
                      ? "text-emerald-600"
                      : negative
                        ? "text-rose-600"
                        : "text-slate-400"
                  }`}
                >
                  {deltaText}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
