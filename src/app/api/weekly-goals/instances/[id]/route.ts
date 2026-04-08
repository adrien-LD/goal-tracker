import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateWeeklyGoalInstanceStatus,
  WeeklyGoalInstanceNotFoundError,
} from "@/lib/weekly-goal-service";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await request.json();

    await updateWeeklyGoalInstanceStatus({
      db: prisma,
      userId: user.id,
      instanceId: params.id,
      completed: Boolean(body.completed),
      now: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WeeklyGoalInstanceNotFoundError) {
      return NextResponse.json(
        { message: "Weekly goal instance not found" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to update weekly goal instance" },
      { status: 500 }
    );
  }
}
