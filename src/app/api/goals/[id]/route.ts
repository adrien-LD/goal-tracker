import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateLocal, listDates, parseDateLocal } from "@/lib/date";
import {
  InvalidTargetCountError,
  parseTargetCount,
} from "@/lib/goal-target-count";

const INVALID_TARGET_COUNT_MESSAGE = "Invalid target count";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const goalId = params.id;
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: user.id },
    });

    if (!goal) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

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

    const oldDates = new Set(listDates(goal.startDate, goal.endDate));
    const newDates = new Set(listDates(start, end));

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    newDates.forEach((date) => {
      if (!oldDates.has(date)) toAdd.push(date);
    });

    oldDates.forEach((date) => {
      if (!newDates.has(date)) toRemove.push(date);
    });

    await prisma.$transaction(async (tx) => {
      await tx.goal.update({
        where: { id: goalId },
        data: {
          title,
          description,
          targetCount,
          startDate: start,
          endDate: end,
        },
      });

      if (toAdd.length) {
        await tx.checkIn.createMany({
          data: toAdd.map((date) => ({ goalId, date })),
        });
      }

      if (toRemove.length) {
        await tx.checkIn.deleteMany({
          where: { goalId, date: { in: toRemove } },
        });
      }
    });

    return NextResponse.json({
      goal: {
        id: goalId,
        title,
        description,
        targetCount,
        startDate: formatDateLocal(start),
        endDate: formatDateLocal(end),
      },
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
      { message: "Failed to update goal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const goalId = params.id;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: user.id },
    });

    if (!goal) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.checkIn.deleteMany({ where: { goalId } });
      await tx.goal.delete({ where: { id: goalId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
