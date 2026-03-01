"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [loggingOut, setLoggingOut] = useState(false);
  const isGoalsPage = pathname.startsWith("/goals");
  const currentQuery = searchParams.toString();
  const currentPath =
    currentQuery.length > 0 ? `${pathname}?${currentQuery}` : pathname;
  const fromParam = searchParams.get("from");
  const isValidFrom = Boolean(
    fromParam &&
      fromParam.startsWith("/") &&
      !fromParam.startsWith("//") &&
      !fromParam.startsWith("/goals")
  );
  const returnHref = isValidFrom ? fromParam! : "/checkins";
  const actionHref = isGoalsPage
    ? returnHref
    : `/goals?from=${encodeURIComponent(currentPath)}`;
  const actionLabel = isGoalsPage ? t("navBack") : t("navGoals");

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-breeze">
      <header className="sticky top-0 z-10 border-b border-cloud bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-ink">{t("appName")}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="hidden text-slate-500 md:inline">
                {t("language")}
              </span>
              <button
                onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
                className="rounded-full border border-cloud px-3 py-1 text-ink transition hover:border-ink"
              >
                {locale === "zh" ? "中文" : "EN"}
              </button>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full border border-cloud px-3 py-1 text-sm font-medium text-ink transition hover:border-ink"
            >
              {t("navLogout")}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      <Link
        href={actionHref}
        aria-label={actionLabel}
        title={actionLabel}
        className={`fixed bottom-5 right-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/70 text-slate-500 shadow-soft backdrop-blur transition hover:border-slate-400 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 md:bottom-6 md:right-8 ${
          isGoalsPage
            ? "border-slate-400 bg-white/85 text-ink"
            : "border-cloud"
        }`}
      >
        <span className="sr-only">{actionLabel}</span>
        {isGoalsPage ? (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7h18" />
            <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <rect x="3" y="7" width="18" height="14" rx="2" />
          </svg>
        )}
      </Link>
    </div>
  );
}
