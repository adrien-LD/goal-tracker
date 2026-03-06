import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateLocal, listDates, parseDateLocal } from "@/lib/date";
import {
  InvalidTargetCountError,
  parseTargetCount,
  resolveGoalTargetCount,
} from "@/lib/goal-target-count";
import { getCompletedCountMap } from "@/lib/goal-progress";

const INVALID_TARGET_COUNT_MESSAGE = "Invalid target count";

type GoalRecord = {
  id: string;
  title: string;
  description: string;
  targetCount: number | null;
  startDate: Date;
  endDate: Date;
};

type MapGoalOptions = {
  goal: GoalRecord;
  completedCount: number;
};

function mapGoal({ goal, completedCount }: MapGoalOptions) {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    targetCount: resolveGoalTargetCount({
      targetCount: goal.targetCount,
      startDate: goal.startDate,
      endDate: goal.endDate,
    }),
    completedCount,
    startDate: formatDateLocal(goal.startDate),
    endDate: formatDateLocal(goal.endDate),
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const completedCountMap = await getCompletedCountMap(
      goals.map((goal) => goal.id)
    );

    return NextResponse.json({
      goals: goals.map((goal) =>
        mapGoal({
          goal,
          completedCount: completedCountMap.get(goal.id) ?? 0,
        })
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to load goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    const targetCount = parseTargetCount(body.targetCount);

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = parseDateLocal(startDate);
    const end = parseDateLocal(endDate);
    if (end < start) {
      return NextResponse.json(
        { message: "End date must be after start date" },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title,
        description,
        targetCount,
        startDate: start,
        endDate: end,
      },
    });

    const dates = listDates(start, end);
    if (dates.length) {
      await prisma.checkIn.createMany({
        data: dates.map((date) => ({
          goalId: goal.id,
          date,
        })),
      });
    }

    return NextResponse.json({
      goal: mapGoal({ goal, completedCount: 0 }),
    });
  } catch (error) {
    if (error instanceof InvalidTargetCountError) {
      return NextResponse.json(
        { message: INVALID_TARGET_COUNT_MESSAGE },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to create goal" },
      { status: 500 }
    );
  }
}
