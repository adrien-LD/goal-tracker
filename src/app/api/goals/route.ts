import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateLocal, listDates, parseDateLocal } from "@/lib/date";

export async function GET() {
  try {
    const user = await requireUser();
    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        startDate: formatDateLocal(goal.startDate),
        endDate: formatDateLocal(goal.endDate),
      })),
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
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        startDate: formatDateLocal(goal.startDate),
        endDate: formatDateLocal(goal.endDate),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to create goal" },
      { status: 500 }
    );
  }
}
