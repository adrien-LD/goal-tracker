"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n";

export default function AuthShell({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand via-white to-breeze">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold text-ink">{t("appName")}</span>
        <button
          onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
          className="rounded-full border border-cloud px-3 py-1 text-xs font-medium text-ink transition hover:border-ink"
        >
          {locale === "zh" ? "中文" : "EN"}
        </button>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-12">
        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-cloud bg-white p-8 shadow-soft">
            {children}
          </section>
          <section className="space-y-4 text-ink">
            <h2 className="text-3xl font-semibold leading-tight">{t("authWelcome")}</h2>
            <p className="text-base text-slate-600">
              {t("goalsSubtitle")} · {t("checkinsSubtitle")}
            </p>
            <div className="grid gap-3 rounded-2xl border border-cloud bg-white p-6 text-sm text-slate-600">
              <div>• {t("createGoal")}</div>
              <div>• {t("checkinsTitle")}</div>
              <div>• {t("goalsTitle")}</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
