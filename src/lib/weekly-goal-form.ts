import type { WeeklyGoalTemplateForm } from "@/lib/weekly-goal-types";

type UnknownRecord = Record<string, unknown>;

export class InvalidWeeklyGoalTemplateFormError extends Error {
  constructor() {
    super("INVALID_WEEKLY_GOAL_TEMPLATE_FORM");
    this.name = "InvalidWeeklyGoalTemplateFormError";
  }
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : {};
}

export function parseWeeklyGoalTemplateForm(
  input: unknown
): WeeklyGoalTemplateForm {
  const body = asRecord(input);
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (!title) {
    throw new InvalidWeeklyGoalTemplateFormError();
  }

  return {
    title,
    description,
  };
}
