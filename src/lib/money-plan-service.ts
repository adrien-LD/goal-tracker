import { prisma } from "@/lib/db";
import { AUGUST_MONEY_PLAN_SEED, parseDeadlineEnd } from "@/lib/money-plan";
import {
  mapPlan,
  type MoneyPlanDetail,
} from "@/lib/money-plan-mapper";

export type { MoneyPlanDetail, MoneyAmountLogView } from "@/lib/money-plan-mapper";

const RECENT_LOG_LIMIT = 20;

const stageInclude = {
  actions: {
    orderBy: { order: "asc" as const },
  },
};

const planInclude = {
  stages: {
    orderBy: { order: "asc" as const },
    include: stageInclude,
  },
  logs: {
    orderBy: { createdAt: "desc" as const },
    take: RECENT_LOG_LIMIT,
  },
};

export async function getOrCreateDefaultMoneyPlan(
  userId: string
): Promise<MoneyPlanDetail> {
  const existing = await prisma.moneyPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: planInclude,
  });
  if (existing) return mapPlan(existing);
  return createDefaultMoneyPlan(userId);
}

export async function createDefaultMoneyPlan(
  userId: string
): Promise<MoneyPlanDetail> {
  const seed = AUGUST_MONEY_PLAN_SEED;
  const deadline = parseDeadlineEnd(seed.deadline);

  const plan = await prisma.moneyPlan.create({
    data: {
      userId,
      title: seed.title,
      startAmount: seed.startAmount,
      finalAmount: seed.finalAmount,
      deadline,
      currentAmount: seed.startAmount,
      stages: {
        create: seed.stages.map((stage) => ({
          order: stage.order,
          title: stage.title,
          targetAmount: stage.targetAmount,
          windowStart: stage.windowStart,
          windowEnd: stage.windowEnd,
          deltaLabel: stage.deltaLabel,
          failLine: stage.failLine,
          actions: {
            create: stage.actions.map((text, index) => ({
              order: index + 1,
              text,
              done: false,
            })),
          },
        })),
      },
      logs: {
        create: {
          amount: seed.startAmount,
          note: "plan_created",
        },
      },
    },
    include: planInclude,
  });

  return mapPlan(plan);
}

export async function getMoneyPlanForUser(
  userId: string,
  planId: string
): Promise<MoneyPlanDetail | null> {
  const plan = await prisma.moneyPlan.findFirst({
    where: { id: planId, userId },
    include: planInclude,
  });
  if (!plan) return null;
  return mapPlan(plan);
}

export async function updateMoneyPlanAmount(options: {
  userId: string;
  planId: string;
  amount: number;
  note?: string;
}): Promise<MoneyPlanDetail | null> {
  const existing = await prisma.moneyPlan.findFirst({
    where: { id: options.planId, userId: options.userId },
    select: { id: true },
  });
  if (!existing) return null;

  const plan = await prisma.$transaction(async (tx) => {
    await tx.moneyPlan.update({
      where: { id: options.planId },
      data: { currentAmount: options.amount },
    });
    await tx.moneyAmountLog.create({
      data: {
        planId: options.planId,
        amount: options.amount,
        note: options.note ?? "amount_update",
      },
    });
    return tx.moneyPlan.findUniqueOrThrow({
      where: { id: options.planId },
      include: planInclude,
    });
  });

  return mapPlan(plan);
}

export async function resetMoneyPlan(options: {
  userId: string;
  planId: string;
}): Promise<MoneyPlanDetail | null> {
  const existing = await prisma.moneyPlan.findFirst({
    where: { id: options.planId, userId: options.userId },
    include: {
      stages: {
        include: { actions: true },
      },
    },
  });
  if (!existing) return null;

  const actionIds = existing.stages.flatMap((stage) =>
    stage.actions.map((action) => action.id)
  );

  const plan = await prisma.$transaction(async (tx) => {
    if (actionIds.length > 0) {
      await tx.moneyStageAction.updateMany({
        where: { id: { in: actionIds } },
        data: { done: false },
      });
    }
    await tx.moneyPlan.update({
      where: { id: options.planId },
      data: { currentAmount: existing.startAmount },
    });
    await tx.moneyAmountLog.create({
      data: {
        planId: options.planId,
        amount: existing.startAmount,
        note: "reset",
      },
    });
    return tx.moneyPlan.findUniqueOrThrow({
      where: { id: options.planId },
      include: planInclude,
    });
  });

  return mapPlan(plan);
}

export async function setMoneyStageActionDone(options: {
  userId: string;
  actionId: string;
  done: boolean;
}): Promise<{ actionId: string; done: boolean; planId: string } | null> {
  const action = await prisma.moneyStageAction.findUnique({
    where: { id: options.actionId },
    include: {
      stage: {
        include: {
          plan: {
            select: { id: true, userId: true },
          },
        },
      },
    },
  });

  if (!action || action.stage.plan.userId !== options.userId) {
    return null;
  }

  const updated = await prisma.moneyStageAction.update({
    where: { id: options.actionId },
    data: { done: options.done },
  });

  return {
    actionId: updated.id,
    done: updated.done,
    planId: action.stage.plan.id,
  };
}
