import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

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

    return NextResponse.json({
      checkIns: checkIns.map((checkIn) => ({
        id: checkIn.id,
        date: checkIn.date,
        completed: checkIn.completed,
        goal: {
          id: checkIn.goal.id,
          title: checkIn.goal.title,
          description: checkIn.goal.description,
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
