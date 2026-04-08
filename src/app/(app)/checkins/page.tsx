"use client";

import { useState } from "react";
import CheckinsDashboard from "@/components/checkins/CheckinsDashboard";
import CheckinsTabPanel from "@/components/checkins/CheckinsTabPanel";
import CheckinsTabs, {
  type CheckinsTab,
} from "@/components/checkins/CheckinsTabs";
import WeeklyGoalsTab from "@/components/checkins/WeeklyGoalsTab";
import { useI18n } from "@/components/i18n";
import { useCheckinsPageData } from "@/components/checkins/useCheckinsPageData";
import { useWeeklyGoalsData } from "@/components/checkins/useWeeklyGoalsData";

const DEFAULT_TAB: CheckinsTab = "checkins";

export default function CheckinsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<CheckinsTab>(DEFAULT_TAB);
  const {
    calendarDays,
    dashboardGoals,
    displayMonth,
    message,
    mobileCheckIns,
    selectedDate,
    setDisplayMonth,
    setSelectedDate,
    toggleCheckin,
    updatingId,
  } = useCheckinsPageData({
    errorMessage: t("errorGeneric"),
  });
  const weeklyGoals = useWeeklyGoalsData({
    errorMessage: t("errorGeneric"),
    requiredMessage: t("errorRequired"),
    successDeletedMessage: t("successDeleted"),
    successSavedMessage: t("successSaved"),
    successUpdatedMessage: t("successUpdated"),
  });

  const activeContent =
    activeTab === "checkins" ? (
      <CheckinsTabPanel
        calendarDays={calendarDays}
        displayMonth={displayMonth}
        message={message}
        mobileCheckIns={mobileCheckIns}
        onSelectDate={setSelectedDate}
        onToggleCheckIn={toggleCheckin}
        selectedDate={selectedDate}
        setDisplayMonth={setDisplayMonth}
        updatingId={updatingId}
      />
    ) : activeTab === "dashboard" ? (
      <CheckinsDashboard goals={dashboardGoals} message={message} />
    ) : (
      <WeeklyGoalsTab
        data={weeklyGoals.data}
        deletingTemplateId={weeklyGoals.deletingTemplateId}
        editingTemplateId={weeklyGoals.editingTemplateId}
        form={weeklyGoals.form}
        loading={weeklyGoals.loading}
        message={weeklyGoals.message}
        onDeleteTemplate={weeklyGoals.deleteTemplate}
        onFormChange={weeklyGoals.handleFormChange}
        onResetForm={weeklyGoals.resetForm}
        onStartEditing={weeklyGoals.startEditing}
        onSubmit={weeklyGoals.submitForm}
        onToggleWeeklyGoal={weeklyGoals.toggleWeeklyGoal}
        saving={weeklyGoals.saving}
        togglingId={weeklyGoals.togglingId}
      />
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t("checkinsTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("checkinsSubtitle")}</p>
      </header>
      <CheckinsTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeContent}
    </div>
  );
}
