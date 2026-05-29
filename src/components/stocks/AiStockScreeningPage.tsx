"use client";

import { useMemo, useState } from "react";
import { readJson, resolveErrorMessage } from "@/components/checkins/utils";
import { useI18n } from "@/components/i18n";
import type {
  AiStockScreeningPayload,
  StockMetricKey,
  StockScreeningRule,
} from "@/lib/stock-screening";

const EXAMPLES = [
  "市盈率低于20，市净率小于3，股息率大于2%",
  "市值大于1000亿，涨幅超过1%",
  "市盈率低于10，市净率小于1",
] as const;

const METRIC_LABELS: Record<StockMetricKey, string> = {
  pe_ttm: "PE(TTM)",
  pb: "PB",
  total_mv_billion: "市值(亿元)",
  pct_chg: "涨跌幅",
  dividend_yield: "股息率",
};

function formatRuleValue(rule: StockScreeningRule) {
  if (Array.isArray(rule.value)) {
    return `${rule.value[0]} - ${rule.value[1]}${rule.unit === "%" ? "%" : ""}`;
  }
  return `${rule.value}${rule.unit === "%" ? "%" : ""}`;
}

function formatMetricValue(value: number | undefined) {
  if (typeof value !== "number") return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function AiStockScreeningPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>(EXAMPLES[0]);
  const [payload, setPayload] = useState<AiStockScreeningPayload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const keyMetrics = useMemo(() => {
    const metrics = payload?.parsedRules.rules.map((rule) => rule.metric) ?? [];
    return Array.from(new Set(metrics)).slice(0, 4);
  }, [payload]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setMessage(t("errorRequired"));
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const nextPayload = await readJson<AiStockScreeningPayload>({
        url: "/api/stock-screen/ai",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            market: "cn",
            limit: 50,
          }),
        },
      });
      setPayload(nextPayload);
    } catch (error) {
      console.error(error);
      setMessage(resolveErrorMessage(error, t("stockScreenError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {t("stockScreenTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("stockScreenSubtitle")}
          </p>
        </div>
        {payload ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cloud bg-white p-4 shadow-soft">
              <div className="text-xs text-slate-500">{t("stockScreenSource")}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {payload.meta.source}
              </div>
            </div>
            <div className="rounded-2xl border border-cloud bg-white p-4 shadow-soft">
              <div className="text-xs text-slate-500">{t("stockScreenUniverse")}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {payload.meta.totalCount}
              </div>
            </div>
            <div className="rounded-2xl border border-cloud bg-white p-4 shadow-soft">
              <div className="text-xs text-slate-500">{t("stockScreenMatches")}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {payload.meta.matchedCount}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-600">
            {t("stockScreenRuleLabel")}
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 min-h-[110px] w-full rounded-xl border border-cloud px-4 py-3 text-ink outline-none focus:border-ink"
              placeholder={t("stockScreenPlaceholder")}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-full border border-cloud px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-ink hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>
          {message ? (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {message}
            </div>
          ) : null}
          <button
            disabled={loading}
            className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {loading ? t("stockScreenRunning") : t("stockScreenSubmit")}
          </button>
        </form>
      </section>

      {payload ? (
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">
                {t("stockScreenParsedRules")}
              </h2>
              {payload.parsedRules.rules.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  {t("stockScreenNoRules")}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {payload.parsedRules.rules.map((rule, index) => (
                    <div
                      key={`${rule.metric}-${index}`}
                      className="rounded-xl bg-sand px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="font-medium text-ink">
                        {METRIC_LABELS[rule.metric]}
                      </span>{" "}
                      {rule.operator} {formatRuleValue(rule)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {payload.warnings.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                <h2 className="font-semibold">{t("stockScreenWarnings")}</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {payload.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-cloud bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">
              {t("stockScreenResults")}
            </h2>
            {payload.results.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-cloud p-8 text-center text-sm text-slate-500">
                {t("stockScreenEmpty")}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-cloud text-xs text-slate-500">
                      <th className="py-3 pr-4 font-medium">{t("stockCode")}</th>
                      <th className="py-3 pr-4 font-medium">{t("stockName")}</th>
                      <th className="py-3 pr-4 font-medium">{t("stockPrice")}</th>
                      {keyMetrics.map((metric) => (
                        <th key={metric} className="py-3 pr-4 font-medium">
                          {METRIC_LABELS[metric]}
                        </th>
                      ))}
                      <th className="py-3 pr-4 font-medium">{t("stockMatchedReasons")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.results.map((stock) => (
                      <tr key={stock.code} className="border-b border-slate-100">
                        <td className="py-4 pr-4 font-medium text-ink">{stock.code}</td>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-ink">{stock.name}</div>
                          <div className="text-xs text-slate-400">
                            {stock.industry || "-"}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-slate-600">
                          {stock.latestPrice ?? "-"}
                        </td>
                        {keyMetrics.map((metric) => (
                          <td key={metric} className="py-4 pr-4 text-slate-600">
                            {formatMetricValue(stock.metrics[metric])}
                          </td>
                        ))}
                        <td className="py-4 pr-4 text-slate-600">
                          {stock.matchedReasons.join("；")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
