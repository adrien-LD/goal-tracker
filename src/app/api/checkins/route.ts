import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveGoalTargetCount } from "@/lib/goal-target-count";

type CompletedCountRow = {
  goalId: string;
  _count: { _all: number };
};

function buildCompletedCountMap(rows: CompletedCountRow[]) {
  return rows.reduce((map, row) => {
    map.set(row.goalId, row._count._all);
    return map;
  }, new Map<string, number>());
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { message: "Missing date" },
        { status: 400 }
      );
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        date,
        goal: { userId: user.id },
      },
      include: {
        goal: true,
      },
      orderBy: {
        goal: { createdAt: "desc" },
      },
    });

    const goalIds = Array.from(new Set(checkIns.map((checkIn) => checkIn.goalId)));
    const completedCounts =
      goalIds.length > 0
        ? await prisma.checkIn.groupBy({
            by: ["goalId"],
            where: {
              goalId: { in: goalIds },
              completed: true,
            },
            _count: {
              _all: true,
            },
          })
        : [];
    const completedCountMap = buildCompletedCountMap(completedCounts);

    return NextResponse.json({
      checkIns: checkIns.map((checkIn) => ({
        id: checkIn.id,
        date: checkIn.date,
        completed: checkIn.completed,
        goal: {
          id: checkIn.goal.id,
          title: checkIn.goal.title,
          description: checkIn.goal.description,
          targetCount: resolveGoalTargetCount({
            targetCount: checkIn.goal.targetCount,
            startDate: checkIn.goal.startDate,
            endDate: checkIn.goal.endDate,
          }),
          completedCount: completedCountMap.get(checkIn.goalId) ?? 0,
        },
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to load check-ins" },
      { status: 500 }
    );
  }
}
