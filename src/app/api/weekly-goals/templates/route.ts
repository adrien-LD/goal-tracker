import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InvalidWeeklyGoalTemplateFormError,
  parseWeeklyGoalTemplateForm,
} from "@/lib/weekly-goal-form";
import { createWeeklyGoalTemplate } from "@/lib/weekly-goal-service";

const INVALID_FORM_MESSAGE = "Missing required fields";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const form = parseWeeklyGoalTemplateForm(body);

    await createWeeklyGoalTemplate({
      db: prisma,
      userId: user.id,
      form,
      now: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidWeeklyGoalTemplateFormError) {
      return NextResponse.json(
        { message: INVALID_FORM_MESSAGE },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to create weekly goal template" },
      { status: 500 }
    );
  }
}
