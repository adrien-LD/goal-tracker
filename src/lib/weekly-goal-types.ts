export type WeeklyGoalTemplateForm = {
  readonly title: string;
  readonly description: string;
};

export type WeeklyGoalCurrentItem = {
  readonly id: string;
  readonly templateId: string;
  readonly title: string;
  readonly description: string;
  readonly completed: boolean;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly templateDeleted: boolean;
};

export type WeeklyGoalHistoryWeek = {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly items: readonly WeeklyGoalCurrentItem[];
};

export type WeeklyGoalCurrentWeek = {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly items: readonly WeeklyGoalCurrentItem[];
};

export type WeeklyGoalsPayload = {
  readonly currentWeek: WeeklyGoalCurrentWeek;
  readonly historyWeeks: readonly WeeklyGoalHistoryWeek[];
};
