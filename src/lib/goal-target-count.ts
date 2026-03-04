const TARGET_COUNT_MIN = 1;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type ResolveGoalTargetCountOptions = {
  targetCount: number | null;
  startDate: Date;
  endDate: Date;
};

function normalizeToLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

export class InvalidTargetCountError extends Error {
  constructor() {
    super("INVALID_TARGET_COUNT");
    this.name = "InvalidTargetCountError";
  }
}

export function parseTargetCount(value: unknown): number {
  const parsed = parseInteger(value);
  if (parsed === null || parsed < TARGET_COUNT_MIN) {
    throw new InvalidTargetCountError();
  }
  return parsed;
}

export function getInclusiveDayCount(startDate: Date, endDate: Date): number {
  const start = normalizeToLocalMidnight(startDate);
  const end = normalizeToLocalMidnight(endDate);
  const dateDiff = end.getTime() - start.getTime();
  return Math.floor(dateDiff / MILLISECONDS_PER_DAY) + TARGET_COUNT_MIN;
}

export function resolveGoalTargetCount({
  targetCount,
  startDate,
  endDate,
}: ResolveGoalTargetCountOptions): number {
  if (targetCount !== null) return targetCount;
  return getInclusiveDayCount(startDate, endDate);
}
