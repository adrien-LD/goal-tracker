import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWeeklyGoalsPayload } from "@/lib/weekly-goal-service";

export async function GET() {
  try {
    const user = await requireUser();
    const payload = await getWeeklyGoalsPayload({
      db: prisma,
      userId: user.id,
      now: new Date(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to load weekly goals" },
      { status: 500 }
    );
  }
}
