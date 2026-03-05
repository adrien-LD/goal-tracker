import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveGoalTargetCount } from "@/lib/goal-target-count";

type DateFilter = {
  date: string;
} | {
  date: {
    gte: string;
    lte: string;
  };
};

type DateFilterResult = {
  errorMessage: string | null;
  filter: DateFilter | null;
};

type CompletedCountRow = {
  goalId: string;
  _count: { _all: number };
};

type CheckInWithGoal = {
  id: string;
  goalId: string;
  date: string;
  completed: boolean;
  goal: {
    id: string;
    title: string;
    description: string;
    targetCount: number | null;
    startDate: Date;
    endDate: Date;
  };
};

function resolveDateFilter(url: URL): DateFilterResult {
  const date = url.searchParams.get("date");
  if (date) {
    return {
      errorMessage: null,
      filter: { date },
    };
  }

  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  if (!startDate || !endDate) {
    return {
      errorMessage: "Missing date or date range",
      filter: null,
    };
  }

  if (endDate < startDate) {
    return {
      errorMessage: "Invalid date range",
      filter: null,
    };
  }

  return {
    errorMessage: null,
    filter: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  };
}

function buildCompletedCountMap(rows: CompletedCountRow[]) {
  return rows.reduce((map, row) => {
    map.set(row.goalId, row._count._all);
    return map;
  }, new Map<string, number>());
}

function mapCheckIns(
  checkIns: CheckInWithGoal[],
  completedCountMap: Map<string, number>
) {
  return checkIns.map((checkIn) => ({
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
  }));
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const dateFilterResult = resolveDateFilter(url);

    if (!dateFilterResult.filter) {
      return NextResponse.json(
        { message: dateFilterResult.errorMessage },
        { status: 400 }
      );
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        ...dateFilterResult.filter,
        goal: { userId: user.id },
      },
      include: {
        goal: true,
      },
      orderBy: [{ date: "asc" }, { goal: { createdAt: "desc" } }],
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
      checkIns: mapCheckIns(checkIns, completedCountMap),
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
