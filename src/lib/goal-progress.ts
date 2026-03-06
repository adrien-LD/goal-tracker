import { prisma } from "@/lib/db";

export async function getCompletedCountMap(goalIds: readonly string[]) {
  if (goalIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.checkIn.groupBy({
    by: ["goalId"],
    where: {
      goalId: { in: [...goalIds] },
      completed: true,
    },
    _count: {
      _all: true,
    },
  });

  return rows.reduce((map, row) => {
    map.set(row.goalId, row._count._all);
    return map;
  }, new Map<string, number>());
}
