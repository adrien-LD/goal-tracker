import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const checkInId = params.id;
    const body = await request.json();
    const completed = Boolean(body.completed);

    const checkIn = await prisma.checkIn.findFirst({
      where: { id: checkInId, goal: { userId: user.id } },
    });

    if (!checkIn) {
      return NextResponse.json(
        { message: "Check-in not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.checkIn.update({
      where: { id: checkInId },
      data: { completed },
    });

    return NextResponse.json({
      checkIn: {
        id: updated.id,
        date: updated.date,
        completed: updated.completed,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to update check-in" },
      { status: 500 }
    );
  }
}
