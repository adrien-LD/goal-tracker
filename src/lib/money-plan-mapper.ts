import {
  computePlanMetrics,
  parseDeadlineEnd,
  resolveStageStatuses,
  stageProgressPct,
  type MoneyPlanMetrics,
  type MoneyStageView,
  type StageStatus,
} from "@/lib/money-plan";

export type PlanStageAction = {
  id: string;
  order: number;
  text: string;
  done: boolean;
};

export type PlanStage = {
  id: string;
  order: number;
  title: string;
  targetAmount: number;
  windowStart: string;
  windowEnd: string;
  deltaLabel: string;
  failLine: string;
  actions: PlanStageAction[];
};

export type PlanLog = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: Date;
};

export type PlanRecord = {
  id: string;
  title: string;
  startAmount: number;
  finalAmount: number;
  deadline: Date;
  currentAmount: number;
  stages: PlanStage[];
  logs: PlanLog[];
};

export type MoneyAmountLogView = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  delta: number;
};

export type MoneyPlanDetail = {
  id: string;
  title: string;
  startAmount: number;
  finalAmount: number;
  deadline: string;
  currentAmount: number;
  stages: MoneyStageView[];
  metrics: MoneyPlanMetrics;
  logs: MoneyAmountLogView[];
};

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mapLogs(logs: PlanLog[]): MoneyAmountLogView[] {
  return logs.map((log, index) => {
    const older = logs[index + 1];
    return {
      id: log.id,
      amount: log.amount,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
      delta: older ? log.amount - older.amount : 0,
    };
  });
}

export function mapPlan(plan: PlanRecord): MoneyPlanDetail {
  const targets = plan.stages.map((stage) => stage.targetAmount);
  const statuses = resolveStageStatuses(targets, plan.currentAmount);
  const stages: MoneyStageView[] = plan.stages.map((stage, index) => {
    const prevTarget =
      index === 0 ? plan.startAmount : plan.stages[index - 1].targetAmount;
    const span = stage.targetAmount - prevTarget;
    return {
      id: stage.id,
      order: stage.order,
      title: stage.title,
      targetAmount: stage.targetAmount,
      windowStart: stage.windowStart,
      windowEnd: stage.windowEnd,
      deltaLabel: stage.deltaLabel,
      failLine: stage.failLine,
      status: statuses[index] as StageStatus,
      need: Math.max(0, stage.targetAmount - plan.currentAmount),
      progressPct: stageProgressPct({
        prevTarget,
        target: stage.targetAmount,
        currentAmount: plan.currentAmount,
      }),
      span,
      actions: stage.actions.map((action) => ({
        id: action.id,
        order: action.order,
        text: action.text,
        done: action.done,
      })),
    };
  });

  const doneCount = statuses.filter((status) => status === "done").length;

  return {
    id: plan.id,
    title: plan.title,
    startAmount: plan.startAmount,
    finalAmount: plan.finalAmount,
    deadline: formatDateOnly(plan.deadline),
    currentAmount: plan.currentAmount,
    stages,
    metrics: computePlanMetrics({
      startAmount: plan.startAmount,
      finalAmount: plan.finalAmount,
      currentAmount: plan.currentAmount,
      deadline: parseDeadlineEnd(plan.deadline),
      doneCount,
    }),
    logs: mapLogs(plan.logs ?? []),
  };
}
