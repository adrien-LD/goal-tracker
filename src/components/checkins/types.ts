export type CheckIn = {
  id: string;
  date: string;
  completed: boolean;
  goal: {
    id: string;
    title: string;
    description: string;
    targetCount: number;
    completedCount: number;
  };
};

export type CheckInsByDate = Record<string, CheckIn[]>;

export type CalendarDayModel = {
  date: string;
  inCurrentMonth: boolean;
  items: CheckIn[];
};
