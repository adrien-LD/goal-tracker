import type { Prisma, PrismaClient } from "@prisma/client";
import { parseDateLocal } from "@/lib/date";
import type {
  WeeklyGoalCurrentItem,
  WeeklyGoalsPayload,
  WeeklyGoalTemplateForm,
} from "@/lib/weekly-goal-types";
import {
  buildWeeklyHistoryGroups,
  resolveTemplateWeekStartDates,
  resolveWeekRange,
} from "@/lib/weekly-goal-utils";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type RootDatabaseClient = PrismaClient;

type WeeklyTemplateWithWeeks = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly instances: readonly {
    readonly weekStartDate: string;
  }[];
};

type WeeklyInstanceRecord = {
  readonly id: string;
  readonly templateId: string;
  readonly titleSnapshot: string;
  readonly descriptionSnapshot: string;
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly completed: boolean;
  readonly template: {
    readonly deletedAt: Date | null;
  };
};

type SyncTemplatesOptions = {
  readonly db: DatabaseClient;
  readonly templates: readonly WeeklyTemplateWithWeeks[];
  readonly now: Date;
};

export class WeeklyGoalTemplateNotFoundError extends Error {
  constructor() { super("WEEKLY_GOAL_TEMPLATE_NOT_FOUND"); this.name = "WeeklyGoalTemplateNotFoundError"; }
}

export class WeeklyGoalTemplateDeletedError extends Error {
  constructor() { super("WEEKLY_GOAL_TEMPLATE_DELETED"); this.name = "WeeklyGoalTemplateDeletedError"; }
}

export class WeeklyGoalInstanceNotFoundError extends Error {
  constructor() { super("WEEKLY_GOAL_INSTANCE_NOT_FOUND"); this.name = "WeeklyGoalInstanceNotFoundError"; }
}

function buildInstanceSeed(template: WeeklyTemplateWithWeeks, weekStartDate: string) {
  return {
    templateId: template.id,
    titleSnapshot: template.title,
    descriptionSnapshot: template.description,
    weekStartDate,
    weekEndDate: resolveWeekRange(parseDateLocal(weekStartDate)).weekEndDate,
  };
}

function buildMissingSeeds(template: WeeklyTemplateWithWeeks, now: Date) {
  const existingWeekStarts = new Set(
    template.instances.map((instance) => instance.weekStartDate)
  );
  return resolveTemplateWeekStartDates({
    createdAt: template.createdAt,
    deletedAt: template.deletedAt,
    now,
  })
    .filter((weekStartDate) => !existingWeekStarts.has(weekStartDate))
    .map((weekStartDate) => buildInstanceSeed(template, weekStartDate));
}

async function syncTemplates({ db, templates, now }: SyncTemplatesOptions) {
  const seeds = templates.flatMap((template) => buildMissingSeeds(template, now));
  if (seeds.length === 0) return;
  await db.weeklyGoalInstance.createMany({ data: seeds });
}

async function findTemplateForUser(db: DatabaseClient, userId: string, templateId: string) {
  const template = await db.weeklyGoalTemplate.findFirst({
    where: { id: templateId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      deletedAt: true,
      instances: {
        select: {
          weekStartDate: true,
        },
      },
    },
  });

  if (!template) {
    throw new WeeklyGoalTemplateNotFoundError();
  }

  return template;
}

async function findInstanceForUser(db: DatabaseClient, userId: string, instanceId: string) {
  const instance = await db.weeklyGoalInstance.findFirst({
    where: { id: instanceId, template: { userId } },
    select: { id: true },
  });

  if (!instance) {
    throw new WeeklyGoalInstanceNotFoundError();
  }

  return instance;
}

function mapWeeklyGoalItem(instance: WeeklyInstanceRecord): WeeklyGoalCurrentItem {
  return {
    id: instance.id,
    templateId: instance.templateId,
    title: instance.titleSnapshot,
    description: instance.descriptionSnapshot,
    completed: instance.completed,
    weekStartDate: instance.weekStartDate,
    weekEndDate: instance.weekEndDate,
    templateDeleted: instance.template.deletedAt !== null,
  };
}

function countCompleted(items: readonly WeeklyGoalCurrentItem[]) {
  return items.reduce((count, item) => count + (item.completed ? 1 : 0), 0);
}

export async function getWeeklyGoalsPayload(options: {
  readonly db: DatabaseClient;
  readonly userId: string;
  readonly now: Date;
}): Promise<WeeklyGoalsPayload> {
  const { db, userId, now } = options;
  const templates = await db.weeklyGoalTemplate.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      deletedAt: true,
      instances: {
        select: {
          weekStartDate: true,
        },
      },
    },
  });
  await syncTemplates({ db, templates, now });

  const currentWeek = resolveWeekRange(now);
  const instances = await db.weeklyGoalInstance.findMany({
    where: { template: { userId } },
    include: {
      template: {
        select: {
          deletedAt: true,
        },
      },
    },
    orderBy: [{ weekStartDate: "desc" }, { template: { createdAt: "desc" } }],
  });
  const grouped = buildWeeklyHistoryGroups({
    currentWeekStartDate: currentWeek.weekStartDate,
    items: instances.map(mapWeeklyGoalItem),
  });

  return {
    currentWeek: {
      ...currentWeek,
      completedCount: countCompleted(grouped.currentWeekItems),
      totalCount: grouped.currentWeekItems.length,
      items: grouped.currentWeekItems,
    },
    historyWeeks: grouped.historyWeeks,
  };
}

export async function createWeeklyGoalTemplate(options: {
  readonly db: RootDatabaseClient;
  readonly userId: string;
  readonly form: WeeklyGoalTemplateForm;
  readonly now: Date;
}) {
  const { db, form, now, userId } = options;
  const currentWeek = resolveWeekRange(now);

  await db.$transaction(async (tx) => {
    const template = await tx.weeklyGoalTemplate.create({
      data: {
        userId,
        title: form.title,
        description: form.description,
        createdAt: now,
      },
    });

    await tx.weeklyGoalInstance.create({
      data: {
        templateId: template.id,
        titleSnapshot: form.title,
        descriptionSnapshot: form.description,
        weekStartDate: currentWeek.weekStartDate,
        weekEndDate: currentWeek.weekEndDate,
      },
    });
  });
}

export async function updateWeeklyGoalTemplate(options: {
  readonly db: RootDatabaseClient;
  readonly userId: string;
  readonly templateId: string;
  readonly form: WeeklyGoalTemplateForm;
  readonly now: Date;
}) {
  const { db, form, now, templateId, userId } = options;
  const currentWeek = resolveWeekRange(now);

  await db.$transaction(async (tx) => {
    const template = await findTemplateForUser(tx, userId, templateId);
    if (template.deletedAt) {
      throw new WeeklyGoalTemplateDeletedError();
    }

    await syncTemplates({ db: tx, templates: [template], now });
    await tx.weeklyGoalTemplate.update({
      where: { id: templateId },
      data: {
        title: form.title,
        description: form.description,
      },
    });
    await tx.weeklyGoalInstance.updateMany({
      where: {
        templateId,
        weekStartDate: currentWeek.weekStartDate,
      },
      data: {
        titleSnapshot: form.title,
        descriptionSnapshot: form.description,
      },
    });
  });
}

export async function deleteWeeklyGoalTemplate(options: {
  readonly db: RootDatabaseClient;
  readonly userId: string;
  readonly templateId: string;
  readonly now: Date;
}) {
  const { db, now, templateId, userId } = options;

  await db.$transaction(async (tx) => {
    const template = await findTemplateForUser(tx, userId, templateId);
    await syncTemplates({ db: tx, templates: [template], now });

    if (template.deletedAt) {
      return;
    }

    await tx.weeklyGoalTemplate.update({
      where: { id: templateId },
      data: { deletedAt: now },
    });
  });
}

export async function updateWeeklyGoalInstanceStatus(options: {
  readonly db: DatabaseClient;
  readonly userId: string;
  readonly instanceId: string;
  readonly completed: boolean;
  readonly now: Date;
}) {
  const { completed, db, instanceId, now, userId } = options;
  await findInstanceForUser(db, userId, instanceId);
  await db.weeklyGoalInstance.update({
    where: { id: instanceId },
    data: {
      completed,
      completedAt: completed ? now : null,
    },
  });
}
