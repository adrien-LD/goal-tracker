import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeeklyHistoryGroups,
  resolveTemplateWeekStartDates,
  resolveWeekRange,
} from "./weekly-goal-utils";

test("resolveWeekRange aligns a date to Monday through Sunday", () => {
  const range = resolveWeekRange(new Date(2026, 2, 25));

  assert.deepEqual(range, {
    weekStartDate: "2026-03-23",
    weekEndDate: "2026-03-29",
  });
});

test("resolveTemplateWeekStartDates includes each active week through the current week", () => {
  const weekStarts = resolveTemplateWeekStartDates({
    createdAt: new Date(2026, 2, 25),
    deletedAt: null,
    now: new Date(2026, 3, 8),
  });

  assert.deepEqual(weekStarts, ["2026-03-23", "2026-03-30", "2026-04-06"]);
});

test("resolveTemplateWeekStartDates keeps the deletion week and skips later weeks", () => {
  const weekStarts = resolveTemplateWeekStartDates({
    createdAt: new Date(2026, 2, 25),
    deletedAt: new Date(2026, 3, 2),
    now: new Date(2026, 3, 20),
  });

  assert.deepEqual(weekStarts, ["2026-03-23", "2026-03-30"]);
});

test("buildWeeklyHistoryGroups separates current week items and sorts history by week", () => {
  const grouped = buildWeeklyHistoryGroups({
    currentWeekStartDate: "2026-03-30",
    items: [
      {
        id: "old-1",
        weekStartDate: "2026-03-16",
        weekEndDate: "2026-03-22",
      },
      {
        id: "current",
        weekStartDate: "2026-03-30",
        weekEndDate: "2026-04-05",
      },
      {
        id: "old-2",
        weekStartDate: "2026-03-23",
        weekEndDate: "2026-03-29",
      },
      {
        id: "old-3",
        weekStartDate: "2026-03-16",
        weekEndDate: "2026-03-22",
      },
    ],
  });

  assert.deepEqual(
    grouped.currentWeekItems.map((item) => item.id),
    ["current"]
  );
  assert.deepEqual(
    grouped.historyWeeks.map((week) => ({
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      ids: week.items.map((item) => item.id),
    })),
    [
      {
        weekStartDate: "2026-03-23",
        weekEndDate: "2026-03-29",
        ids: ["old-2"],
      },
      {
        weekStartDate: "2026-03-16",
        weekEndDate: "2026-03-22",
        ids: ["old-1", "old-3"],
      },
    ]
  );
});
