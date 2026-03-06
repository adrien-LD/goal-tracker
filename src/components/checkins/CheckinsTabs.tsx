"use client";

import { useI18n } from "@/components/i18n";

export type CheckinsTab = "checkins" | "dashboard";

type CheckinsTabsProps = {
  activeTab: CheckinsTab;
  onChange: (tab: CheckinsTab) => void;
};

const TABS: readonly CheckinsTab[] = ["checkins", "dashboard"];

export default function CheckinsTabs({
  activeTab,
  onChange,
}: CheckinsTabsProps) {
  const { t } = useI18n();

  return (
    <div
      className="inline-flex rounded-2xl border border-cloud bg-white p-1 shadow-soft"
      role="tablist"
      aria-label={t("checkinsTitle")}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const label =
          tab === "checkins" ? t("checkinsTabCalendar") : t("checkinsTabDashboard");

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-ink text-white"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
